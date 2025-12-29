// app/api/webhooks/solana/route.ts
// Webhook handler for Solana payment verification

import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';
import prisma from '@/lib/prisma';
import { 
  sendOrderConfirmation, 
  sendNewOrderNotification,
  sendLowStockAlert,
} from '@/lib/email';
import { createNotification } from '@/lib/notifications';

const SOLANA_RPC = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

// Verify webhook signature (if using a service like Helius)
function verifyWebhookSignature(request: NextRequest, body: string): boolean {
  if (!WEBHOOK_SECRET) return true; // Skip if no secret configured
  
  const signature = request.headers.get('x-webhook-signature');
  if (!signature) return false;

  // Implement your signature verification here
  // This depends on your webhook provider (Helius, QuickNode, etc.)
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    
    // Verify webhook signature
    if (!verifyWebhookSignature(request, body)) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const data = JSON.parse(body);

    // Handle different webhook types
    // This structure depends on your webhook provider
    const { type, transaction, signature } = data;

    if (type === 'TRANSACTION' || data[0]?.signature) {
      // Handle transaction confirmation
      const txSignature = signature || data[0]?.signature;
      
      if (txSignature) {
        await handleTransactionConfirmation(txSignature);
      }
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleTransactionConfirmation(txSignature: string) {
  // Find order by payment reference or transaction signature
  const order = await prisma.order.findFirst({
    where: {
      OR: [
        { paymentTx: txSignature },
        { paymentReference: txSignature },
      ],
    },
    include: {
      customer: true,
      store: {
        include: { owner: true },
      },
      items: true,
    },
  });

  if (!order) {
    console.log('No order found for transaction:', txSignature);
    return;
  }

  if (order.paymentStatus === 'COMPLETED') {
    console.log('Order already marked as paid:', order.id);
    return;
  }

  // Verify transaction on-chain
  const connection = new Connection(SOLANA_RPC);
  
  try {
    const tx = await connection.getTransaction(txSignature, {
      maxSupportedTransactionVersion: 0,
    });

    if (!tx) {
      console.log('Transaction not found on chain:', txSignature);
      return;
    }

    // Check if transaction was successful
    if (tx.meta?.err) {
      console.log('Transaction failed:', txSignature);
      await prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: 'FAILED' },
      });
      return;
    }

    // Update order status
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: 'COMPLETED',
        status: 'PAID',
        paymentTx: txSignature,
        paidAt: new Date(),
      },
    });

    // Update store stats
    await prisma.store.update({
      where: { id: order.storeId },
      data: {
        totalSales: { increment: Number(order.subtotal) },
        totalOrders: { increment: 1 },
      },
    });

    // Send notifications
    // Customer notification
    await createNotification({
      userId: order.customerId,
      type: 'ORDER_PAID',
      title: 'Payment Confirmed',
      message: `Your payment for order #${order.orderNumber} has been confirmed!`,
      metadata: { orderId: order.id, orderNumber: order.orderNumber },
    });

    // Merchant notification
    await createNotification({
      userId: order.store.owner.id,
      type: 'ORDER_PAID',
      title: 'Payment Received',
      message: `Payment confirmed for order #${order.orderNumber}`,
      metadata: { orderId: order.id, orderNumber: order.orderNumber },
    });

    console.log('Order payment confirmed:', order.id);

  } catch (error) {
    console.error('Transaction verification error:', error);
  }
}

// Manual payment verification endpoint
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    const txSignature = searchParams.get('tx');

    if (!orderId || !txSignature) {
      return NextResponse.json(
        { error: 'Order ID and transaction signature are required' },
        { status: 400 }
      );
    }

    // Update order with tx signature
    await prisma.order.update({
      where: { id: orderId },
      data: { paymentTx: txSignature },
    });

    // Verify the transaction
    await handleTransactionConfirmation(txSignature);

    // Fetch updated order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        paymentTx: true,
      },
    });

    return NextResponse.json({
      success: true,
      order,
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
}
