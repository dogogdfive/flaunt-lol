// app/api/buyer/orders/route.ts
// Get buyer's orders

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    if (!walletAddress) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user
    const user = await prisma.user.findFirst({
      where: { walletAddress },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get all orders for this user
    const orders = await prisma.order.findMany({
      where: { customerId: user.id },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            contactEmail: true,
            owner: {
              select: {
                email: true,
              },
            },
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                slug: true,
                images: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      orders: orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        total: Number(order.subtotal),
        currency: order.paymentCurrency,
        createdAt: order.createdAt.toISOString(),
        paidAt: order.paidAt?.toISOString() || null,
        shippedAt: order.shippedAt?.toISOString() || null,
        deliveredAt: order.deliveredAt?.toISOString() || null,
        estimatedDelivery: order.estimatedDelivery?.toISOString() || null,
        trackingNumber: order.trackingNumber,
        trackingUrl: order.trackingUrl,
        carrier: order.carrier,
        shippingAddress: order.shippingAddress,
        store: {
          id: order.store.id,
          name: order.store.name,
          slug: order.store.slug,
          logoUrl: order.store.logoUrl,
          // Include store email for buyer to contact merchant
          email: order.store.contactEmail || order.store.owner.email,
        },
        items: order.items.map((item) => ({
          id: item.id,
          name: item.productName,
          image: item.productImage || item.product.images?.[0],
          quantity: item.quantity,
          price: Number(item.price),
          currency: item.currency,
          variantName: item.variantName,
          productSlug: item.product.slug,
        })),
      })),
    });
  } catch (error) {
    console.error('Buyer orders error:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}
