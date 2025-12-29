// app/api/orders/[id]/confirm/route.ts
// Buyer confirms receipt of order - releases escrow

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { createNotification } from '@/lib/notifications';

// POST - Confirm receipt
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const orderId = params.id;

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
        { error: 'Not authorized to confirm this order' },
        { status: 403 }
      );
    }

    // Check order is in correct status (must be SHIPPED or DELIVERED)
    if (!['SHIPPED', 'DELIVERED'].includes(order.status)) {
      return NextResponse.json(
        { error: `Cannot confirm order in ${order.status} status. Order must be shipped first.` },
        { status: 400 }
      );
    }

    // Already confirmed
    if (order.buyerConfirmedAt) {
      return NextResponse.json(
        { error: 'Order already confirmed' },
        { status: 400 }
      );
    }

    // Update order to CONFIRMED
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'CONFIRMED',
        buyerConfirmedAt: new Date(),
        deliveredAt: order.deliveredAt || new Date(),
      },
    });

    // Notify merchant that buyer confirmed
    if (order.store.owner) {
      await createNotification({
        userId: order.store.owner.id,
        type: 'ORDER_CONFIRMED',
        title: 'Buyer Confirmed Receipt!',
        message: `Order #${order.orderNumber} has been confirmed. Funds will be released to your wallet.`,
        metadata: { orderId: order.id, orderNumber: order.orderNumber },
      });
    }

    // TODO: Trigger automatic payout or add to payout queue
    // For now, admin manually processes payouts

    return NextResponse.json({
      success: true,
      message: 'Order confirmed! Thank you for your purchase.',
      order: {
        id: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        status: updatedOrder.status,
        buyerConfirmedAt: updatedOrder.buyerConfirmedAt,
      },
    });

  } catch (error) {
    console.error('Order confirmation error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Please connect your wallet' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to confirm order' },
      { status: 500 }
    );
  }
}
