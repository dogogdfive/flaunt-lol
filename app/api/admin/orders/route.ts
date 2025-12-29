// app/api/admin/orders/route.ts
// Admin API to fetch all orders across all stores

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

// Fetch platform fee from database
async function getPlatformFeePercent(): Promise<number> {
  const setting = await prisma.platformSettings.findUnique({
    where: { key: 'platform_fee_percent' },
  });
  if (setting?.value && typeof setting.value === 'object' && 'value' in setting.value) {
    return Number((setting.value as { value: number }).value) || 3.5;
  }
  return 3.5;
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const storeId = searchParams.get('storeId');

    const where: any = {};
    if (status) where.status = status;
    if (storeId) where.storeId = storeId;

    const orders = await prisma.order.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            walletAddress: true,
            email: true,
          },
        },
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        items: {
          select: {
            id: true,
            productName: true,
            variantName: true,
            quantity: true,
            price: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get platform fee for display
    const platformFeePercent = await getPlatformFeePercent();

    return NextResponse.json({
      success: true,
      platformFeePercent,
      orders: orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        customer: order.customer,
        store: order.store,
        items: order.items.map((item) => ({
          ...item,
          price: Number(item.price),
        })),
        subtotal: Number(order.subtotal),
        platformFee: Number(order.platformFee),
        merchantAmount: Number(order.merchantAmount),
        paymentCurrency: order.paymentCurrency,
        status: order.status,
        paymentStatus: order.paymentStatus,
        trackingNumber: order.trackingNumber,
        carrier: order.carrier,
        trackingUrl: order.trackingUrl,
        createdAt: order.createdAt.toISOString(),
        paidAt: order.paidAt?.toISOString() || null,
        shippedAt: order.shippedAt?.toISOString() || null,
        deliveredAt: order.deliveredAt?.toISOString() || null,
        buyerConfirmedAt: order.buyerConfirmedAt?.toISOString() || null,
        estimatedDelivery: order.estimatedDelivery?.toISOString() || null,
        disputeReason: order.disputeReason,
        shippingAddress: order.shippingAddress,
        merchantNotes: order.merchantNotes,
        labelUrl: order.labelUrl,
      })),
    });
  } catch (error) {
    console.error('Admin orders error:', error);

    if (error instanceof Error && error.message === 'Admin access required') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
