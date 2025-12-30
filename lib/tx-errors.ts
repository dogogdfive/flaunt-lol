// lib/tx-errors.ts
// Blockchain transaction error parsing and handling

// Common Solana error patterns
const errorPatterns: { pattern: RegExp; message: string }[] = [
  // Insufficient funds
  { pattern: /insufficient funds/i, message: 'Insufficient funds in your wallet' },
  { pattern: /0x1\b/i, message: 'Insufficient balance for this transaction' },
  { pattern: /insufficient lamports/i, message: 'Not enough SOL for transaction fees' },

  // Token account errors
  { pattern: /account not found/i, message: 'Token account not found. You may need to create one first.' },
  { pattern: /TokenAccountNotFoundError/i, message: 'You don\'t have a USDC token account. Please add USDC to your wallet first.' },
  { pattern: /could not find account/i, message: 'Wallet account not found on the network' },

  // Transaction errors
  { pattern: /blockhash not found/i, message: 'Transaction expired. Please try again.' },
  { pattern: /transaction.*expired/i, message: 'Transaction expired. Please try again.' },
  { pattern: /block height exceeded/i, message: 'Transaction took too long. Please try again.' },

  // Signature errors
  { pattern: /signature verification failed/i, message: 'Transaction signature failed. Please try again.' },
  { pattern: /invalid signature/i, message: 'Invalid transaction signature' },

  // User rejection
  { pattern: /user rejected/i, message: 'Transaction cancelled by user' },
  { pattern: /user denied/i, message: 'Transaction cancelled by user' },
  { pattern: /rejected the request/i, message: 'Transaction cancelled' },

  // Network errors
  { pattern: /network error/i, message: 'Network error. Please check your connection.' },
  { pattern: /failed to fetch/i, message: 'Network error. Please try again.' },
  { pattern: /timeout/i, message: 'Request timed out. Please try again.' },
  { pattern: /rate limit/i, message: 'Too many requests. Please wait a moment.' },

  // Program errors
  { pattern: /custom program error/i, message: 'Smart contract error. Please try again.' },
  { pattern: /program failed/i, message: 'Transaction failed on the blockchain' },
  { pattern: /instruction error/i, message: 'Transaction instruction failed' },

  // Simulation errors
  { pattern: /simulation failed/i, message: 'Transaction simulation failed. Please check your balance.' },
  { pattern: /Transaction simulation failed/i, message: 'Transaction would fail. Please check your balance.' },
];

// Parse transaction error into user-friendly message
export function parseTxError(error: any): string {
  const errorMessage = error?.message || error?.toString() || 'Unknown error';

  // Check against known patterns
  for (const { pattern, message } of errorPatterns) {
    if (pattern.test(errorMessage)) {
      return message;
    }
  }

  // Check for simulation error with specific message
  const simulationMatch = errorMessage.match(/Error Message: ([^.]+)/);
  if (simulationMatch) {
    return `Transaction failed: ${simulationMatch[1]}`;
  }

  // Check for custom error code
  const errorCodeMatch = errorMessage.match(/custom error: (\d+)/i);
  if (errorCodeMatch) {
    return `Transaction failed with code ${errorCodeMatch[1]}`;
  }

  // If error is too technical, simplify it
  if (errorMessage.length > 200 || errorMessage.includes('0x')) {
    return 'Transaction failed. Please try again.';
  }

  return errorMessage;
}

// Determine if error is retryable
export function isRetryableError(error: any): boolean {
  const errorMessage = error?.message || error?.toString() || '';

  const retryablePatterns = [
    /blockhash not found/i,
    /transaction.*expired/i,
    /block height exceeded/i,
    /network error/i,
    /failed to fetch/i,
    /timeout/i,
    /rate limit/i,
  ];

  return retryablePatterns.some(pattern => pattern.test(errorMessage));
}

// Get error category for analytics/tracking
export function getErrorCategory(error: any): 'user' | 'balance' | 'network' | 'blockchain' | 'unknown' {
  const errorMessage = error?.message || error?.toString() || '';

  if (/user rejected|user denied|cancelled/i.test(errorMessage)) {
    return 'user';
  }

  if (/insufficient|balance|funds|lamports/i.test(errorMessage)) {
    return 'balance';
  }

  if (/network|fetch|timeout|rate limit/i.test(errorMessage)) {
    return 'network';
  }

  if (/blockhash|simulation|program|signature/i.test(errorMessage)) {
    return 'blockchain';
  }

  return 'unknown';
}

// Log transaction error with context
export function logTxError(error: any, context: Record<string, any> = {}): void {
  const category = getErrorCategory(error);
  const parsedMessage = parseTxError(error);
  const isRetryable = isRetryableError(error);

  console.error('[TX Error]', {
    category,
    parsedMessage,
    isRetryable,
    originalError: error?.message || error?.toString(),
    ...context,
  });
}

// Transaction result type
export interface TxResult {
  success: boolean;
  signature?: string;
  error?: string;
  category?: 'user' | 'balance' | 'network' | 'blockchain' | 'unknown';
  isRetryable?: boolean;
}

// Wrap transaction execution with error handling
export async function withTxErrorHandling<T>(
  txFn: () => Promise<T>,
  context: Record<string, any> = {}
): Promise<TxResult & { data?: T }> {
  try {
    const data = await txFn();
    return { success: true, data };
  } catch (error: any) {
    logTxError(error, context);
    return {
      success: false,
      error: parseTxError(error),
      category: getErrorCategory(error),
      isRetryable: isRetryableError(error),
    };
  }
}
