// lib/api-error.ts
// Consistent API error handling

import { NextResponse } from 'next/server';

// Error codes for consistent error handling
export const ErrorCodes = {
  // Authentication errors (401)
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  SESSION_EXPIRED: 'SESSION_EXPIRED',

  // Authorization errors (403)
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  NOT_STORE_OWNER: 'NOT_STORE_OWNER',
  NOT_ADMIN: 'NOT_ADMIN',

  // Validation errors (400)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_FIELD: 'MISSING_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',

  // Not found errors (404)
  NOT_FOUND: 'NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  STORE_NOT_FOUND: 'STORE_NOT_FOUND',
  PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',

  // Conflict errors (409)
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  USERNAME_TAKEN: 'USERNAME_TAKEN',

  // Payment errors (402/400)
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',

  // Server errors (500)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

interface ApiErrorOptions {
  code: ErrorCode;
  message: string;
  details?: Record<string, any>;
  status?: number;
}

// Create consistent error response
export function apiError({ code, message, details, status }: ApiErrorOptions): NextResponse {
  const statusCode = status || getStatusFromCode(code);

  console.error(`[API Error] ${code}: ${message}`, details || '');

  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        ...(details && { details }),
      },
    },
    { status: statusCode }
  );
}

// Create success response
export function apiSuccess<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(
    {
      success: true,
      ...data,
    },
    { status }
  );
}

// Get HTTP status from error code
function getStatusFromCode(code: ErrorCode): number {
  switch (code) {
    case ErrorCodes.UNAUTHORIZED:
    case ErrorCodes.INVALID_TOKEN:
    case ErrorCodes.SESSION_EXPIRED:
      return 401;

    case ErrorCodes.FORBIDDEN:
    case ErrorCodes.INSUFFICIENT_PERMISSIONS:
    case ErrorCodes.NOT_STORE_OWNER:
    case ErrorCodes.NOT_ADMIN:
      return 403;

    case ErrorCodes.VALIDATION_ERROR:
    case ErrorCodes.INVALID_INPUT:
    case ErrorCodes.MISSING_FIELD:
    case ErrorCodes.INVALID_FORMAT:
    case ErrorCodes.PAYMENT_FAILED:
    case ErrorCodes.INSUFFICIENT_BALANCE:
    case ErrorCodes.TRANSACTION_FAILED:
      return 400;

    case ErrorCodes.NOT_FOUND:
    case ErrorCodes.USER_NOT_FOUND:
    case ErrorCodes.STORE_NOT_FOUND:
    case ErrorCodes.PRODUCT_NOT_FOUND:
    case ErrorCodes.ORDER_NOT_FOUND:
      return 404;

    case ErrorCodes.ALREADY_EXISTS:
    case ErrorCodes.DUPLICATE_ENTRY:
    case ErrorCodes.USERNAME_TAKEN:
      return 409;

    default:
      return 500;
  }
}

// Parse API error on client side
export function parseApiError(error: any): { code: string; message: string } {
  if (error?.error?.code && error?.error?.message) {
    return {
      code: error.error.code,
      message: error.error.message,
    };
  }

  if (error?.message) {
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message,
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: 'An unexpected error occurred',
  };
}

// User-friendly error messages
export const friendlyErrors: Record<ErrorCode, string> = {
  [ErrorCodes.UNAUTHORIZED]: 'Please connect your wallet to continue',
  [ErrorCodes.INVALID_TOKEN]: 'Your session is invalid. Please reconnect.',
  [ErrorCodes.SESSION_EXPIRED]: 'Your session has expired. Please reconnect.',
  [ErrorCodes.FORBIDDEN]: 'You don\'t have permission to do this',
  [ErrorCodes.INSUFFICIENT_PERMISSIONS]: 'You don\'t have the required permissions',
  [ErrorCodes.NOT_STORE_OWNER]: 'You must be the store owner to do this',
  [ErrorCodes.NOT_ADMIN]: 'Admin access required',
  [ErrorCodes.VALIDATION_ERROR]: 'Please check your input and try again',
  [ErrorCodes.INVALID_INPUT]: 'Invalid input provided',
  [ErrorCodes.MISSING_FIELD]: 'Please fill in all required fields',
  [ErrorCodes.INVALID_FORMAT]: 'Invalid format',
  [ErrorCodes.NOT_FOUND]: 'The requested item was not found',
  [ErrorCodes.USER_NOT_FOUND]: 'User not found',
  [ErrorCodes.STORE_NOT_FOUND]: 'Store not found',
  [ErrorCodes.PRODUCT_NOT_FOUND]: 'Product not found',
  [ErrorCodes.ORDER_NOT_FOUND]: 'Order not found',
  [ErrorCodes.ALREADY_EXISTS]: 'This item already exists',
  [ErrorCodes.DUPLICATE_ENTRY]: 'This entry already exists',
  [ErrorCodes.USERNAME_TAKEN]: 'This username is already taken',
  [ErrorCodes.PAYMENT_FAILED]: 'Payment failed. Please try again.',
  [ErrorCodes.INSUFFICIENT_BALANCE]: 'Insufficient balance',
  [ErrorCodes.TRANSACTION_FAILED]: 'Transaction failed on blockchain',
  [ErrorCodes.INTERNAL_ERROR]: 'Something went wrong. Please try again.',
  [ErrorCodes.DATABASE_ERROR]: 'Database error. Please try again.',
  [ErrorCodes.EXTERNAL_SERVICE_ERROR]: 'External service error. Please try again.',
};
