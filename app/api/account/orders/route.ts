// app/api/account/orders/route.ts
// Get customer's order history

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const orders = await prisma.order.findMany({
      where: { customerId: user.id },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, slug: true, images: true },
            },
          },
        },
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
            contactEmail: true,
            owner: { select: { email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedOrders = orders.map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      subtotal: Number(order.subtotal),
      currency: order.paymentCurrency,
      trackingNumber: order.trackingNumber,
      carrier: order.carrier,
      trackingUrl: order.trackingUrl,
      createdAt: order.createdAt,
      paidAt: order.paidAt,
      shippedAt: order.shippedAt,
      deliveredAt: order.deliveredAt,
      estimatedDelivery: order.estimatedDelivery,
      buyerConfirmedAt: order.buyerConfirmedAt,
      store: {
        id: order.store.id,
        name: order.store.name,
        slug: order.store.slug,
        email: order.store.contactEmail || order.store.owner?.email || null,
      },
      items: order.items.map(item => ({
        id: item.id,
        productName: item.productName,
        productImage: item.productImage,
        variantName: item.variantName,
        quantity: item.quantity,
        price: Number(item.price),
        currency: item.currency,
        product: item.product,
      })),
    }));

    return NextResponse.json({
      success: true,
      orders: formattedOrders,
    });

  } catch (error) {
    console.error('Error fetching orders:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Please connect your wallet' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
