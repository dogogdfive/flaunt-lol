// lib/moonpay.ts
// MoonPay payment integration utilities

import crypto from 'crypto';

const MOONPAY_PUBLIC_KEY = process.env.NEXT_PUBLIC_MOONPAY_PUBLIC_KEY || '';
const MOONPAY_SECRET_KEY = process.env.MOONPAY_SECRET_KEY || '';
const MOONPAY_WEBHOOK_SECRET = process.env.MOONPAY_WEBHOOK_SECRET || '';
const MOONPAY_BASE_URL = process.env.NEXT_PUBLIC_MOONPAY_BASE_URL || 'https://buy.moonpay.com';

export interface MoonPayPaymentParams {
  orderId: string;
  amount: number;
  currency: 'SOL' | 'ETH' | 'USDT' | 'USD'; // Currency customer wants to receive
  baseCurrency?: 'USD'; // Currency customer pays with (for debit cards)
  walletAddress?: string; // Wallet address to send crypto to (for crypto payments)
  email?: string;
  redirectURL?: string;
}

export interface MoonPayWidgetConfig {
  currencyCode: string;
  environment: 'sandbox' | 'production';
  flow: 'buy' | 'sell';
  variant: 'embedded' | 'overlay' | 'newTab';
  baseCurrencyAmount?: string;
  baseCurrencyCode?: string;
  defaultCurrencyCode?: string;
  enabledPaymentMethods?: string[];
  theme?: 'dark' | 'light';
  showOnlyCurrencies?: string;
  walletAddress?: string;
  walletAddresses?: string;
  redirectURL?: string;
  signature?: string;
}

/**
 * Generate MoonPay payment URL with signature
 */
export function generateMoonPayUrl(params: MoonPayPaymentParams): string {
  const {
    orderId,
    amount,
    currency,
    baseCurrency = 'USD',
    walletAddress,
    email,
    redirectURL = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/checkout?payment=success&orderId=${orderId}`,
  } = params;

  // Map currency codes for MoonPay
  const currencyMap: Record<string, string> = {
    SOL: 'sol',
    ETH: 'eth',
    USDT: 'usdt_erc20', // USDT on Ethereum
    USD: 'usd',
  };

  const moonpayCurrency = currencyMap[currency] || currency.toLowerCase();

  // Build query parameters
  const queryParams = new URLSearchParams({
    apiKey: MOONPAY_PUBLIC_KEY,
    currencyCode: moonpayCurrency,
    baseCurrencyAmount: amount.toString(),
    baseCurrencyCode: baseCurrency,
    externalCustomerId: orderId,
    redirectURL,
  });

  if (walletAddress) {
    queryParams.append('walletAddress', walletAddress);
  }

  if (email) {
    queryParams.append('email', email);
  }

  // Generate signature
  const unsignedUrl = `${MOONPAY_BASE_URL}?${queryParams.toString()}`;
  const signature = crypto
    .createHmac('sha256', MOONPAY_SECRET_KEY)
    .update(new URL(unsignedUrl).search)
    .digest('base64');

  queryParams.append('signature', signature);

  return `${MOONPAY_BASE_URL}?${queryParams.toString()}`;
}

/**
 * Generate MoonPay widget configuration
 */
export function generateMoonPayWidgetConfig(
  params: MoonPayPaymentParams
): MoonPayWidgetConfig {
  const {
    orderId,
    amount,
    currency,
    baseCurrency = 'USD',
    walletAddress,
    redirectURL = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/checkout?payment=success&orderId=${orderId}`,
  } = params;

  const currencyMap: Record<string, string> = {
    SOL: 'sol',
    ETH: 'eth',
    USDT: 'usdt_erc20',
    USD: 'usd',
  };

  const moonpayCurrency = currencyMap[currency] || currency.toLowerCase();

  const config: MoonPayWidgetConfig = {
    currencyCode: moonpayCurrency,
    environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
    flow: 'buy',
    variant: 'embedded',
    baseCurrencyAmount: amount.toString(),
    baseCurrencyCode: baseCurrency,
    defaultCurrencyCode: moonpayCurrency,
    enabledPaymentMethods: currency === 'USD' 
      ? ['credit_debit_card', 'apple_pay', 'google_pay'] // For debit card
      : ['credit_debit_card'], // For crypto, can use card or wallet
    theme: 'dark',
    redirectURL,
  };

  if (walletAddress && currency !== 'USD') {
    // For crypto payments, set the wallet address
    if (currency === 'SOL') {
      config.walletAddress = walletAddress;
    } else if (currency === 'ETH' || currency === 'USDT') {
      // Ethereum and USDT use the same wallet address format
      config.walletAddress = walletAddress;
    }
  }

  // Generate signature for widget
  // Note: MoonPay widget signature is generated differently than URL signature
  // For widget, we need to sign the specific parameters
  const signatureParams = new URLSearchParams({
    currencyCode: moonpayCurrency,
    baseCurrencyAmount: amount.toString(),
    baseCurrencyCode: baseCurrency,
    externalCustomerId: orderId,
  });

  if (walletAddress && currency !== 'USD') {
    signatureParams.append('walletAddress', walletAddress);
  }

  if (redirectURL) {
    signatureParams.append('redirectURL', redirectURL);
  }

  const signature = crypto
    .createHmac('sha256', MOONPAY_SECRET_KEY)
    .update(signatureParams.toString())
    .digest('base64');

  config.signature = signature;

  return config;
}

/**
 * Verify MoonPay webhook signature
 */
export function verifyMoonPayWebhook(
  payload: string,
  signature: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', MOONPAY_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * MoonPay webhook event types
 */
export interface MoonPayWebhookEvent {
  type: 'transaction_updated' | 'transaction_created' | 'transaction_failed';
  data: {
    id: string;
    type: 'buy' | 'sell';
    status: 'pending' | 'waitingPayment' | 'pendingRefund' | 'completed' | 'failed';
    baseCurrencyAmount: number;
    quoteCurrencyAmount: number;
    baseCurrencyCode: string;
    quoteCurrencyCode: string;
    walletAddress?: string;
    walletAddressTag?: string;
    externalTransactionId?: string;
    externalCustomerId?: string; // This is our orderId
    createdAt: string;
    updatedAt: string;
  };
}
