// app/api/orders/[id]/pay/route.ts
// Verify and confirm payment transaction

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createNotification } from '@/lib/notifications';
import {
  sendOrderConfirmation,
  sendNewOrderNotification,
  sendNewOrderToAdmin,
} from '@/lib/email';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'lopserf@gmail.com';

const SOLANA_RPC = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const DEFAULT_PLATFORM_WALLET = '5CoxdsuoRHDwDPVYqPoeiJxWZ588jXhpimCRJUj8FUN1';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const PAYMENT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

// Get platform wallet from database settings
async function getPlatformWallet(): Promise<string> {
  try {
    const setting = await prisma.platformSettings.findUnique({
      where: { key: 'platform_wallet' },
    });
    if (setting?.value && typeof setting.value === 'object' && 'value' in setting.value) {
      return String((setting.value as { value: string }).value) || DEFAULT_PLATFORM_WALLET;
    }
  } catch (error) {
    console.error('Error fetching platform wallet:', error);
  }
  return DEFAULT_PLATFORM_WALLET;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const orderId = params.id;
    const body = await request.json();
    const { txSignature, expectedMemo } = body;

    if (!txSignature) {
      return NextResponse.json(
        { error: 'Transaction signature required' },
        { status: 400 }
      );
    }

    // Get the order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        store: {
          include: { owner: true },
        },
        items: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Verify buyer owns this order
    if (order.customerId !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      );
    }

    // Check order isn't already paid
    if (order.paymentStatus === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Order already paid' },
        { status: 400 }
      );
    }

    // Check order was created within 5 minutes
    const orderAge = Date.now() - new Date(order.createdAt).getTime();
    if (orderAge > PAYMENT_WINDOW_MS) {
      // Cancel the expired order
      await prisma.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED' },
      });
      return NextResponse.json(
        { error: 'Payment window expired. Order cancelled. Please try again.' },
        { status: 400 }
      );
    }

    // Verify the transaction on Solana
    const connection = new Connection(SOLANA_RPC, 'confirmed');

    const tx = await connection.getTransaction(txSignature, {
      maxSupportedTransactionVersion: 0,
    });

    if (!tx) {
      return NextResponse.json(
        { error: 'Transaction not found on blockchain' },
        { status: 400 }
      );
    }

    // Check transaction was successful
    if (tx.meta?.err) {
      return NextResponse.json(
        { error: 'Transaction failed on blockchain' },
        { status: 400 }
      );
    }

    // If expectedMemo is provided (external wallet payment), verify the memo
    // The memo should match the order number
    if (expectedMemo) {
      const logMessages = tx.meta?.logMessages || [];
      const memoFound = logMessages.some(log => {
        // Memo program logs look like: "Program log: Memo (len X): <memo content>"
        // Or the memo content itself may appear in logs
        return log.includes(expectedMemo) || log.includes(`Memo`) && log.includes(order.orderNumber);
      });

      // Also check if the order number appears anywhere in the transaction data
      // Some wallets include memo differently
      const txString = JSON.stringify(tx);
      const orderNumberInTx = txString.includes(order.orderNumber);

      if (!memoFound && !orderNumberInTx) {
        console.log(`Memo verification failed. Expected: ${expectedMemo}, Order: ${order.orderNumber}`);
        console.log('Transaction logs:', logMessages);
        return NextResponse.json(
          { error: `Payment memo verification failed. The transaction does not contain the required order number (${order.orderNumber}). Please ensure you included the order number as a memo in your transaction.` },
          { status: 400 }
        );
      }
    }

    // Verify payment amount and recipient
    const expectedAmount = Number(order.subtotal);
    const PLATFORM_WALLET = await getPlatformWallet();
    const platformWallet = new PublicKey(PLATFORM_WALLET);
    let paymentVerified = false;

    let receivedAmount = 0;

    if (order.paymentCurrency === 'SOL') {
      // Verify SOL transfer
      const preBalances = tx.meta?.preBalances || [];
      const postBalances = tx.meta?.postBalances || [];
      const accountKeys = tx.transaction.message.getAccountKeys().staticAccountKeys;

      for (let i = 0; i < accountKeys.length; i++) {
        if (accountKeys[i].equals(platformWallet)) {
          receivedAmount = (postBalances[i] - preBalances[i]) / LAMPORTS_PER_SOL;
          // Accept any amount >= expected amount (overpayment is fine, no refunds)
          if (receivedAmount >= expectedAmount - 0.000001) {
            paymentVerified = true;
            break;
          }
        }
      }
    } else {
      // Verify USDC transfer
      const preTokenBalances = tx.meta?.preTokenBalances || [];
      const postTokenBalances = tx.meta?.postTokenBalances || [];

      for (const post of postTokenBalances) {
        if (
          post.mint === USDC_MINT &&
          post.owner === PLATFORM_WALLET
        ) {
          const pre = preTokenBalances.find(
            (p) => p.accountIndex === post.accountIndex
          );
          const preAmount = pre ? Number(pre.uiTokenAmount.uiAmount || 0) : 0;
          const postAmount = Number(post.uiTokenAmount.uiAmount || 0);
          receivedAmount = postAmount - preAmount;

          // Accept any amount >= expected amount (overpayment is fine, no refunds)
          if (receivedAmount >= expectedAmount - 0.000001) {
            paymentVerified = true;
            break;
          }
        }
      }
    }

    if (!paymentVerified) {
      console.log(`Payment verification failed: received ${receivedAmount}, expected ${expectedAmount}`);
      return NextResponse.json(
        { error: `Payment too low. Received ${receivedAmount.toFixed(6)} ${order.paymentCurrency}, expected ${expectedAmount.toFixed(6)} ${order.paymentCurrency}. Underpayments are not processed and refunds are not available.` },
        { status: 400 }
      );
    }

    // Update order to PAID
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: 'COMPLETED',
        status: 'PAID',
        paymentTx: txSignature,
        paidAt: new Date(),
      },
    });

    // Create pending payout for merchant
    const merchantWallet = order.store.payoutWallet || order.store.owner?.walletAddress;
    if (merchantWallet) {
      await prisma.payout.create({
        data: {
          storeId: order.storeId,
          amount: order.merchantAmount,
          currency: order.paymentCurrency as 'SOL' | 'USDC',
          status: 'PENDING',
          walletAddress: merchantWallet,
          orderCount: 1,
          orders: {
            connect: { id: order.id },
          },
        },
      });
    }

    // Clear the user's cart now that payment is confirmed
    await prisma.cartItem.deleteMany({
      where: { userId: user.id },
    });

    // Update store stats
    await prisma.store.update({
      where: { id: order.storeId },
      data: {
        totalSales: { increment: Number(order.merchantAmount) },
        totalOrders: { increment: 1 },
      },
    });

    // Update product stats (bonding curve, total sold)
    for (const item of order.items) {
      await prisma.product.update({
        where: { id: item.productId },
        data: {
          totalSold: { increment: item.quantity },
          quantity: { decrement: item.quantity },
          bondingCurrent: { increment: item.quantity },
        },
      });
    }

    // Get shipping address for emails
    const shippingAddress = order.shippingAddress as any;

    // Send confirmation email to customer
    if (order.customerEmail) {
      try {
        await sendOrderConfirmation(order.customerEmail, {
          orderNumber: order.orderNumber,
          customerName: shippingAddress?.name || 'Customer',
          items: order.items.map((item) => ({
            name: item.productName,
            variant: item.variantName || undefined,
            quantity: item.quantity,
            price: Number(item.price).toString(),
            image: item.productImage || undefined,
          })),
          subtotal: Number(order.subtotal).toFixed(4),
          currency: order.paymentCurrency,
          shippingAddress,
          storeName: order.store.name,
        });
      } catch (e) {
        console.error('Failed to send customer email:', e);
      }
    }

    // Send notification to merchant
    if (order.store.owner?.email) {
      try {
        await sendNewOrderNotification(order.store.owner.email, {
          orderNumber: order.orderNumber,
          items: order.items.map((item) => ({
            name: item.productName,
            variant: item.variantName || undefined,
            quantity: item.quantity,
            price: Number(item.price).toString(),
          })),
          subtotal: Number(order.subtotal).toFixed(4),
          merchantAmount: Number(order.merchantAmount).toFixed(4),
          currency: order.paymentCurrency,
          shippingAddress: {
            ...shippingAddress,
            email: order.customerEmail,
          },
          storeName: order.store.name,
        });
      } catch (e) {
        console.error('Failed to send merchant email:', e);
      }

      // In-app notification
      await createNotification({
        userId: order.store.owner.id,
        type: 'ORDER_PLACED',
        title: 'New Paid Order!',
        message: `Order #${order.orderNumber} - ${Number(order.subtotal).toFixed(4)} ${order.paymentCurrency}`,
        metadata: { orderId: order.id, orderNumber: order.orderNumber },
      });
    }

    // Send notification to admin
    try {
      await sendNewOrderToAdmin(ADMIN_EMAIL, {
        orderNumber: order.orderNumber,
        items: order.items.map((item) => ({
          name: item.productName,
          variant: item.variantName || undefined,
          quantity: item.quantity,
          price: Number(item.price).toString(),
        })),
        subtotal: Number(order.subtotal).toFixed(4),
        merchantAmount: Number(order.merchantAmount).toFixed(4),
        currency: order.paymentCurrency,
        shippingAddress: {
          ...shippingAddress,
          email: order.customerEmail || '',
        },
        storeName: order.store.name,
        customerEmail: order.customerEmail || 'No email provided',
      });
    } catch (e) {
      console.error('Failed to send admin email:', e);
    }

    return NextResponse.json({
      success: true,
      message: 'Payment confirmed!',
      order: {
        id: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        status: updatedOrder.status,
        paymentStatus: updatedOrder.paymentStatus,
        txSignature,
      },
    });

  } catch (error) {
    console.error('Payment confirmation error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Please connect your wallet' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to confirm payment' },
      { status: 500 }
    );
  }
}
