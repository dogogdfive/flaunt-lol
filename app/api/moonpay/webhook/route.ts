// app/api/moonpay/webhook/route.ts
// MoonPay webhook handler for payment callbacks

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyMoonPayWebhook, MoonPayWebhookEvent } from '@/lib/moonpay';
import { createNotification } from '@/lib/notifications';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-moonpay-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401 }
      );
    }

    // Verify webhook signature
    const isValid = verifyMoonPayWebhook(body, signature);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const event: MoonPayWebhookEvent = JSON.parse(body);

    console.log('MoonPay webhook received:', event.type, event.data);

    // Extract orderId from externalCustomerId
    const orderId = event.data.externalCustomerId;
    if (!orderId) {
      console.error('No orderId in MoonPay webhook');
      return NextResponse.json(
        { error: 'Missing orderId' },
        { status: 400 }
      );
    }

    // Get order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        store: true,
      },
    });

    if (!order) {
      console.error('Order not found:', orderId);
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Handle different event types
    switch (event.type) {
      case 'transaction_created':
        // Transaction created, waiting for payment
        console.log('MoonPay transaction created for order:', orderId);
        break;

      case 'transaction_updated':
        // Transaction status updated
        const status = event.data.status;

        if (status === 'completed') {
          // Payment completed
          await prisma.order.update({
            where: { id: orderId },
            data: {
              paymentStatus: 'COMPLETED',
              status: 'PAID',
              paymentTx: event.data.id, // Store MoonPay transaction ID
              paidAt: new Date(event.data.updatedAt),
            },
          });

          // Clear cart
          await prisma.cartItem.deleteMany({
            where: { userId: order.customerId },
          });

          // Update product quantities
          for (const item of order.items || []) {
            await prisma.product.update({
              where: { id: item.productId },
              data: {
                totalSold: { increment: item.quantity },
                quantity: { decrement: item.quantity },
                bondingCurrent: { increment: item.quantity },
              },
            });
          }

          // Update store stats
          await prisma.store.update({
            where: { id: order.storeId },
            data: {
              totalSales: { increment: Number(order.merchantAmount) },
              totalOrders: { increment: 1 },
            },
          });

          // Notify customer
          await createNotification({
            userId: order.customerId,
            type: 'ORDER_PAID',
            title: 'Payment Confirmed',
            message: `Your payment for order ${order.orderNumber} has been confirmed.`,
            metadata: {
              orderId: order.id,
              orderNumber: order.orderNumber,
            },
          });

          // Notify merchant
          await createNotification({
            userId: order.store.ownerId,
            type: 'ORDER_RECEIVED',
            title: 'New Order Received',
            message: `You have a new order: ${order.orderNumber}`,
            metadata: {
              orderId: order.id,
              orderNumber: order.orderNumber,
            },
          });

          console.log('MoonPay payment completed for order:', orderId);
        } else if (status === 'failed') {
          // Payment failed
          await prisma.order.update({
            where: { id: orderId },
            data: {
              paymentStatus: 'FAILED',
              status: 'CANCELLED',
            },
          });

          // Notify customer
          await createNotification({
            userId: order.customerId,
            type: 'PAYMENT_FAILED',
            title: 'Payment Failed',
            message: `Your payment for order ${order.orderNumber} could not be processed.`,
            metadata: {
              orderId: order.id,
              orderNumber: order.orderNumber,
            },
          });

          console.log('MoonPay payment failed for order:', orderId);
        }
        break;

      case 'transaction_failed':
        // Transaction failed
        await prisma.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: 'FAILED',
            status: 'CANCELLED',
          },
        });

        await createNotification({
          userId: order.customerId,
          type: 'PAYMENT_FAILED',
          title: 'Payment Failed',
          message: `Your payment for order ${order.orderNumber} could not be processed.`,
          metadata: {
            orderId: order.id,
            orderNumber: order.orderNumber,
          },
        });

        console.log('MoonPay transaction failed for order:', orderId);
        break;
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('MoonPay webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// MoonPay webhooks are GET requests for health checks
export async function GET() {
  return NextResponse.json({ status: 'ok' });
}
