// app/api/merchant/orders/[id]/tracking/route.ts
// Add/update tracking number for an order

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { trackingNumber, carrier, trackingUrl } = body;

    if (!trackingNumber) {
      return NextResponse.json(
        { error: 'Tracking number is required' },
        { status: 400 }
      );
    }

    // Get the order and verify ownership
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        store: true,
        customer: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check if user owns the store
    if (order.store.ownerId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Update order with tracking info
    const updatedOrder = await prisma.order.update({
      where: { id: params.id },
      data: {
        trackingNumber,
        carrier: carrier || null,
        trackingUrl: trackingUrl || null,
        status: 'SHIPPED',
        shippedAt: new Date(),
      },
    });

    // Create notification for the customer
    await prisma.notification.create({
      data: {
        userId: order.customerId,
        type: 'TRACKING_ADDED',
        title: 'Tracking Number Added',
        message: `Tracking number added for order "${order.id.slice(0, 8)}..."`,
        metadata: {
          orderId: order.id,
          trackingNumber,
          carrier,
          trackingUrl,
        },
      },
    });

    // Create notification for the merchant (confirmation)
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'TRACKING_ADDED',
        title: 'Tracking Number Added',
        message: `Tracking number added for order "${order.id.slice(0, 8)}..."`,
        metadata: {
          orderId: order.id,
          trackingNumber,
          carrier,
        },
      },
    });

    return NextResponse.json({
      success: true,
      order: updatedOrder,
    });

  } catch (error) {
    console.error('Error adding tracking:', error);
    return NextResponse.json(
      { error: 'Failed to add tracking' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        trackingNumber: true,
        carrier: true,
        trackingUrl: true,
        status: true,
        shippedAt: true,
        store: {
          select: { ownerId: true },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check if user owns the store or is the customer
    if (order.store.ownerId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      tracking: {
        trackingNumber: order.trackingNumber,
        carrier: order.carrier,
        trackingUrl: order.trackingUrl,
        status: order.status,
        shippedAt: order.shippedAt,
      },
    });

  } catch (error) {
    console.error('Error fetching tracking:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tracking' },
      { status: 500 }
    );
  }
}
