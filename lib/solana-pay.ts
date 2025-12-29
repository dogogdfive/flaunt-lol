// lib/solana-pay.ts
// Solana Pay integration for payments

import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  Keypair,
} from '@solana/web3.js';
import {
  createTransferInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAccount,
} from '@solana/spl-token';
import { encodeURL, createQR } from '@solana/pay';
import BigNumber from 'bignumber.js';
import { v4 as uuidv4 } from 'uuid';
import prisma from './prisma';
import type { PaymentCurrency } from '@/types';

// ==========================================
// CONFIGURATION
// ==========================================

// Solana RPC endpoint (use Helius for production)
const SOLANA_RPC = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const connection = new Connection(SOLANA_RPC, 'confirmed');

// USDC Token Mint Address (Mainnet)
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

// USDC Decimals
const USDC_DECIMALS = 6;

// ==========================================
// PLATFORM SETTINGS
// ==========================================

async function getPlatformSettings() {
  const settings = await prisma.platformSettings.findMany();
  const settingsMap: Record<string, any> = {};
  settings.forEach((s) => {
    settingsMap[s.key] = s.value;
  });
  return {
    platformWallet: settingsMap['platform_wallet']?.value || '',
    platformFeePercent: settingsMap['platform_fee_percent']?.value || 3.5,
  };
}

// ==========================================
// CREATE PAYMENT REQUEST
// ==========================================

export interface CreatePaymentParams {
  orderId: string;
  amount: number;
  currency: PaymentCurrency;
  storeName: string;
  orderNumber: string;
}

export interface PaymentRequestResult {
  url: string;
  reference: string;
  qrCode: string; // Base64 encoded QR code
}

export async function createPaymentRequest(
  params: CreatePaymentParams
): Promise<PaymentRequestResult> {
  const { orderId, amount, currency, storeName, orderNumber } = params;

  // Get platform wallet
  const settings = await getPlatformSettings();
  const recipientAddress = new PublicKey(settings.platformWallet);

  // Generate unique reference for this payment
  const reference = new Keypair().publicKey;
  const referenceStr = reference.toBase58();

  // Store reference in database
  await prisma.order.update({
    where: { id: orderId },
    data: { paymentReference: referenceStr },
  });

  // Build payment URL
  let url: URL;

  if (currency === 'SOL') {
    // SOL payment
    url = encodeURL({
      recipient: recipientAddress,
      amount: new BigNumber(amount),
      reference,
      label: storeName,
      message: `Order ${orderNumber}`,
      memo: `order:${orderId}`,
    });
  } else {
    // USDC payment
    url = encodeURL({
      recipient: recipientAddress,
      amount: new BigNumber(amount),
      splToken: USDC_MINT,
      reference,
      label: storeName,
      message: `Order ${orderNumber}`,
      memo: `order:${orderId}`,
    });
  }

  // Generate QR code
  const qr = createQR(url, 400, 'white', 'black');
  const qrBlob = await qr.getRawData('png');
  const qrBase64 = qrBlob ? Buffer.from(await qrBlob.arrayBuffer()).toString('base64') : '';

  return {
    url: url.toString(),
    reference: referenceStr,
    qrCode: `data:image/png;base64,${qrBase64}`,
  };
}

// ==========================================
// VERIFY PAYMENT
// ==========================================

export interface VerifyPaymentResult {
  verified: boolean;
  signature?: string;
  error?: string;
}

export async function verifyPayment(reference: string): Promise<VerifyPaymentResult> {
  try {
    const referenceKey = new PublicKey(reference);

    // Find transactions with this reference
    const signatures = await connection.getSignaturesForAddress(referenceKey, {
      limit: 1,
    });

    if (signatures.length === 0) {
      return { verified: false, error: 'No transaction found' };
    }

    const signature = signatures[0].signature;

    // Get transaction details
    const transaction = await connection.getTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });

    if (!transaction) {
      return { verified: false, error: 'Transaction not found' };
    }

    // Verify transaction was successful
    if (transaction.meta?.err) {
      return { verified: false, error: 'Transaction failed' };
    }

    return {
      verified: true,
      signature,
    };
  } catch (error) {
    console.error('Payment verification error:', error);
    return {
      verified: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ==========================================
// PROCESS PAYMENT (after verification)
// ==========================================

export async function processPayment(orderId: string, txSignature: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { store: true },
  });

  if (!order) {
    throw new Error('Order not found');
  }

  // Get platform fee
  const settings = await getPlatformSettings();
  const platformFeePercent = settings.platformFeePercent;

  // Calculate amounts
  const subtotal = Number(order.subtotal);
  const platformFee = subtotal * (platformFeePercent / 100);
  const merchantAmount = subtotal - platformFee;

  // Update order
  await prisma.order.update({
    where: { id: orderId },
    data: {
      paymentStatus: 'COMPLETED',
      status: 'PAID',
      paymentTx: txSignature,
      platformFee: platformFee,
      merchantAmount: merchantAmount,
      paidAt: new Date(),
    },
  });

  // Update store stats
  await prisma.store.update({
    where: { id: order.storeId },
    data: {
      totalSales: { increment: merchantAmount },
      totalOrders: { increment: 1 },
    },
  });

  // Update product stats and inventory
  const orderItems = await prisma.orderItem.findMany({
    where: { orderId },
  });

  for (const item of orderItems) {
    await prisma.product.update({
      where: { id: item.productId },
      data: {
        totalSold: { increment: item.quantity },
        quantity: { decrement: item.quantity },
        bondingCurrent: { increment: item.quantity },
      },
    });
  }

  console.log(`✅ Payment processed for order ${order.orderNumber}`);
}

// ==========================================
// PROCESS PAYOUT (send to merchant)
// ==========================================

export interface ProcessPayoutParams {
  payoutId: string;
  signerPrivateKey: string; // Platform wallet private key (from secure vault)
}

export async function processPayout(params: ProcessPayoutParams): Promise<string> {
  const { payoutId, signerPrivateKey } = params;

  const payout = await prisma.payout.findUnique({
    where: { id: payoutId },
    include: { store: true },
  });

  if (!payout) {
    throw new Error('Payout not found');
  }

  if (payout.status !== 'PENDING') {
    throw new Error('Payout already processed');
  }

  // Update status to processing
  await prisma.payout.update({
    where: { id: payoutId },
    data: { status: 'PROCESSING' },
  });

  try {
    // Create signer keypair from private key
    const signerKeypair = Keypair.fromSecretKey(
      Buffer.from(signerPrivateKey, 'base64')
    );

    const merchantWallet = new PublicKey(payout.walletAddress);
    const amount = Number(payout.amount);

    let signature: string;

    if (payout.currency === 'SOL') {
      // Send SOL
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: signerKeypair.publicKey,
          toPubkey: merchantWallet,
          lamports: Math.floor(amount * LAMPORTS_PER_SOL),
        })
      );

      signature = await connection.sendTransaction(transaction, [signerKeypair]);
    } else {
      // Send USDC
      const fromTokenAccount = await getAssociatedTokenAddress(
        USDC_MINT,
        signerKeypair.publicKey
      );
      
      const toTokenAccount = await getAssociatedTokenAddress(
        USDC_MINT,
        merchantWallet
      );

      const transaction = new Transaction().add(
        createTransferInstruction(
          fromTokenAccount,
          toTokenAccount,
          signerKeypair.publicKey,
          Math.floor(amount * Math.pow(10, USDC_DECIMALS))
        )
      );

      signature = await connection.sendTransaction(transaction, [signerKeypair]);
    }

    // Wait for confirmation
    await connection.confirmTransaction(signature, 'confirmed');

    // Update payout status
    await prisma.payout.update({
      where: { id: payoutId },
      data: {
        status: 'COMPLETED',
        txSignature: signature,
        processedAt: new Date(),
      },
    });

    console.log(`✅ Payout ${payoutId} completed: ${signature}`);
    return signature;

  } catch (error) {
    console.error('Payout error:', error);

    // Update payout status to failed
    await prisma.payout.update({
      where: { id: payoutId },
      data: {
        status: 'FAILED',
        failureReason: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    throw error;
  }
}

// ==========================================
// CREATE PAYOUT RECORD
// ==========================================

export async function createPayout(storeId: string): Promise<string> {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
  });

  if (!store?.payoutWallet) {
    throw new Error('Store has no payout wallet configured');
  }

  // Get completed orders that haven't been paid out yet
  // Orders must be CONFIRMED by buyer OR auto-confirmed after 14 days
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const unpaidOrders = await prisma.order.findMany({
    where: {
      storeId,
      paymentStatus: 'COMPLETED',
      payoutId: null,
      OR: [
        // Buyer confirmed receipt
        { status: 'CONFIRMED' },
        // Auto-confirm after 14 days if shipped
        {
          status: 'SHIPPED',
          shippedAt: { lt: fourteenDaysAgo },
        },
        {
          status: 'DELIVERED',
          deliveredAt: { lt: fourteenDaysAgo },
        },
      ],
    },
  });

  if (unpaidOrders.length === 0) {
    throw new Error('No orders eligible for payout');
  }

  // Calculate total payout amount
  const totalAmount = unpaidOrders.reduce(
    (sum, order) => sum + Number(order.merchantAmount),
    0
  );

  // Get currency (assume all orders same currency for simplicity)
  const currency = unpaidOrders[0].paymentCurrency;

  // Create payout record
  const payout = await prisma.payout.create({
    data: {
      storeId,
      amount: totalAmount,
      currency,
      status: 'PENDING',
      walletAddress: store.payoutWallet,
      orderCount: unpaidOrders.length,
      periodStart: unpaidOrders[unpaidOrders.length - 1].paidAt!,
      periodEnd: unpaidOrders[0].paidAt!,
    },
  });

  // Link orders to payout
  await prisma.order.updateMany({
    where: {
      id: { in: unpaidOrders.map((o) => o.id) },
    },
    data: {
      payoutId: payout.id,
    },
  });

  return payout.id;
}

// ==========================================
// GET WALLET BALANCE
// ==========================================

export async function getWalletBalance(walletAddress: string) {
  const publicKey = new PublicKey(walletAddress);

  // Get SOL balance
  const solBalance = await connection.getBalance(publicKey);

  // Get USDC balance
  let usdcBalance = 0;
  try {
    const tokenAccount = await getAssociatedTokenAddress(USDC_MINT, publicKey);
    const account = await getAccount(connection, tokenAccount);
    usdcBalance = Number(account.amount) / Math.pow(10, USDC_DECIMALS);
  } catch (e) {
    // Token account doesn't exist, balance is 0
  }

  return {
    sol: solBalance / LAMPORTS_PER_SOL,
    usdc: usdcBalance,
  };
}
