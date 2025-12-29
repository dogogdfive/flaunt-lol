// app/api/orders/[id]/dispute/route.ts
// Buyer opens a dispute on an order

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { createNotification } from '@/lib/notifications';

// POST - Open dispute
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const orderId = params.id;
    const body = await request.json();
    const { reason } = body;

    if (!reason || reason.trim().length < 10) {
      return NextResponse.json(
        { error: 'Please provide a detailed reason for the dispute (at least 10 characters)' },
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
        { error: 'Not authorized to dispute this order' },
        { status: 403 }
      );
    }

    // Check order can be disputed (must be SHIPPED or DELIVERED, not already confirmed/disputed)
    if (!['SHIPPED', 'DELIVERED'].includes(order.status)) {
      return NextResponse.json(
        { error: `Cannot dispute order in ${order.status} status` },
        { status: 400 }
      );
    }

    // Update order to DISPUTED
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'DISPUTED',
        disputeReason: reason.trim(),
      },
    });

    // Notify merchant
    if (order.store.owner) {
      await createNotification({
        userId: order.store.owner.id,
        type: 'ORDER_DISPUTED',
        title: 'Order Dispute Opened',
        message: `Buyer opened a dispute on order #${order.orderNumber}. Please contact support.`,
        metadata: { orderId: order.id, orderNumber: order.orderNumber, reason },
      });
    }

    // Notify admin (if configured)
    const adminUsers = await prisma.user.findMany({
      where: { role: 'ADMIN' },
    });

    for (const admin of adminUsers) {
      await createNotification({
        userId: admin.id,
        type: 'ORDER_DISPUTED',
        title: 'New Order Dispute',
        message: `Dispute opened on order #${order.orderNumber}`,
        metadata: { orderId: order.id, orderNumber: order.orderNumber, reason },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Dispute opened. Our support team will review and contact you within 24 hours.',
      order: {
        id: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        status: updatedOrder.status,
      },
    });

  } catch (error) {
    console.error('Order dispute error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Please connect your wallet' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to open dispute' },
      { status: 500 }
    );
  }
}
