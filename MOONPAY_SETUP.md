# MoonPay Integration Setup Guide

This guide explains how to set up MoonPay for your checkout system to accept Solana, Ethereum, USDT, and debit card payments.

## ✅ What's Been Implemented

### 1. MoonPay Payment Library (`lib/moonpay.ts`)
- URL generation with signature for MoonPay checkout
- Widget configuration generation
- Webhook signature verification utilities

### 2. MoonPay API Routes
- **`/api/moonpay/create`** - Creates MoonPay payment URL for orders
  - Accepts: `orderId`, `paymentMethod` (solana/ethereum/usdt/debit_card), `walletAddress`
  - Returns: MoonPay URL and widget config

- **`/api/moonpay/webhook`** - Handles MoonPay payment callbacks
  - Verifies webhook signatures
  - Updates order status when payments complete
  - Processes completed/failed payments

### 3. Checkout Page Updates (`app/(store)/checkout/page.tsx`)
- Added MoonPay payment method option
- Payment type selector: Debit Card, Solana, Ethereum, USDT
- MoonPay widget integration (opens in new window)
- Automatic payment status polling after MoonPay redirect

## 🔧 Setup Instructions

### Step 1: Create MoonPay Account

1. Go to https://www.moonpay.com/business and sign up
2. Complete KYC/verification process
3. Get your API keys from the dashboard:
   - **Public API Key** (`pk_test_...` or `pk_live_...`)
   - **Secret API Key** (`sk_test_...` or `sk_live_...`)
   - **Webhook Secret** (from webhook settings)

### Step 2: Configure Environment Variables

Add to your `.env.local` file:

```env
# MoonPay Configuration
NEXT_PUBLIC_MOONPAY_PUBLIC_KEY="pk_test_your_public_key"
MOONPAY_SECRET_KEY="sk_test_your_secret_key"
MOONPAY_WEBHOOK_SECRET="your_webhook_secret"
NEXT_PUBLIC_MOONPAY_BASE_URL="https://buy.moonpay.com"

# For sandbox testing:
# NEXT_PUBLIC_MOONPAY_BASE_URL="https://buy-staging.moonpay.com"
```

### Step 3: Configure MoonPay Webhook

1. Go to MoonPay Dashboard → Settings → Webhooks
2. Add webhook URL: `https://yourdomain.com/api/moonpay/webhook`
3. Enable events: `transaction_created`, `transaction_updated`, `transaction_failed`
4. Save the webhook secret and add it to `.env.local`

### Step 4: Configure Platform Wallet

Make sure you have a platform wallet configured:

```env
NEXT_PUBLIC_PLATFORM_WALLET="YourSolanaWalletPublicKey"
```

For Ethereum/USDT payments, MoonPay will send to the same wallet address (if it's an Ethereum-compatible address) or you can configure a separate Ethereum wallet.

### Step 5: Test the Integration

1. **Test Debit Card Payment:**
   - Go to checkout page
   - Select "MoonPay" → "Debit Card"
   - Click "Pay with Card"
   - Complete test payment in MoonPay window
   - Verify order status updates automatically

2. **Test Crypto Payments:**
   - Go to checkout page
   - Select "MoonPay" → "Solana" (or Ethereum/USDT)
   - Click "Buy SOL/ETH/USDT"
   - Complete purchase in MoonPay window
   - Verify crypto is sent to platform wallet

## 📋 Payment Flow

### Customer Flow:
1. Customer adds items to cart
2. Goes to checkout page
3. Selects "MoonPay" payment method
4. Chooses payment type (Debit Card/Solana/Ethereum/USDT)
5. Clicks "Pay with Card" or "Buy [crypto]"
6. Order is created (status: PENDING)
7. MoonPay window opens
8. Customer completes payment in MoonPay
9. MoonPay redirects back to checkout page
10. System polls for payment status
11. When MoonPay webhook confirms payment, order status updates to PAID

### Webhook Flow:
1. MoonPay sends webhook to `/api/moonpay/webhook`
2. System verifies webhook signature
3. Extracts `orderId` from `externalCustomerId`
4. Updates order status based on payment status:
   - `completed` → Order status: PAID, Payment status: COMPLETED
   - `failed` → Order status: CANCELLED, Payment status: FAILED
5. Sends notifications to customer and merchant

## 🔒 Security Notes

1. **Never expose secret keys**: `MOONPAY_SECRET_KEY` and `MOONPAY_WEBHOOK_SECRET` must be server-side only
2. **Always verify webhooks**: The webhook handler verifies signatures before processing
3. **Use HTTPS in production**: MoonPay requires HTTPS for webhook URLs
4. **Test in sandbox first**: Use `pk_test_` and `sk_test_` keys for testing

## 🐛 Troubleshooting

### MoonPay widget not opening
- Check that `NEXT_PUBLIC_MOONPAY_PUBLIC_KEY` is set correctly
- Verify the public key is active in MoonPay dashboard
- Check browser console for errors

### Webhook not receiving events
- Verify webhook URL is accessible from MoonPay (use ngrok for local testing)
- Check that webhook secret matches in MoonPay dashboard and `.env.local`
- Ensure webhook URL uses HTTPS in production

### Payments not completing
- Check MoonPay dashboard for transaction status
- Verify `externalCustomerId` (orderId) is being set correctly
- Check server logs for webhook processing errors
- Ensure platform wallet address is valid for the selected currency

### Signature verification failing
- Verify `MOONPAY_SECRET_KEY` matches the secret key in MoonPay dashboard
- Check that webhook payload is being received correctly
- Ensure signature is calculated using the correct secret

## 📚 MoonPay Documentation

- **API Documentation**: https://docs.moonpay.com/
- **Webhooks Guide**: https://docs.moonpay.com/webhooks
- **Supported Currencies**: https://support.moonpay.com/hc/en-us/articles/360011931457
- **Payment Methods**: https://support.moonpay.com/hc/en-us/articles/360012441117

## 🚀 Next Steps

1. ✅ Configure MoonPay account and get API keys
2. ✅ Add environment variables to `.env.local`
3. ✅ Set up webhook endpoint in MoonPay dashboard
4. ✅ Test with MoonPay sandbox/test mode
5. ✅ Switch to production keys when ready
6. ✅ Monitor webhook logs for any issues

## 💡 Tips

- Start with test/sandbox mode to verify everything works
- Use MoonPay's test cards for debit card testing: https://docs.moonpay.com/testing
- For local development, use ngrok to expose your webhook endpoint
- Monitor MoonPay dashboard for transaction status and any issues
- Set up email notifications in MoonPay dashboard for important events
