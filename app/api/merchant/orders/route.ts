// app/api/merchant/orders/route.ts
// Get merchant's orders

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    if (!walletAddress) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user and their store
    const user = await prisma.user.findFirst({
      where: { walletAddress },
      include: {
        stores: {
          where: { status: 'APPROVED' },
          take: 1,
        },
      },
    });

    if (!user || user.stores.length === 0) {
      return NextResponse.json({ error: 'No approved store found' }, { status: 404 });
    }

    const store = user.stores[0];

    // Get all orders for this store
    const orders = await prisma.order.findMany({
      where: { storeId: store.id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            walletAddress: true,
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
        total: `${Number(order.merchantAmount).toFixed(4)} ${order.paymentCurrency}`,
        subtotal: Number(order.subtotal),
        merchantAmount: Number(order.merchantAmount),
        currency: order.paymentCurrency,
        createdAt: order.createdAt.toISOString(),
        paidAt: order.paidAt?.toISOString() || null,
        shippedAt: order.shippedAt?.toISOString() || null,
        deliveredAt: order.deliveredAt?.toISOString() || null,
        estimatedDelivery: order.estimatedDelivery?.toISOString() || null,
        trackingNumber: order.trackingNumber,
        trackingUrl: order.trackingUrl,
        carrier: order.carrier,
        labelUrl: order.labelUrl,
        merchantNotes: order.merchantNotes,
        shippingAddress: order.shippingAddress,
        customer: {
          name: order.customer.name || (order.shippingAddress as any)?.name || 'Anonymous',
          email: order.customerEmail || order.customer.email,
          walletAddress: order.customer.walletAddress,
        },
        items: order.items.map((item) => ({
          id: item.id,
          name: item.productName,
          image: item.productImage || item.product.images?.[0],
          quantity: item.quantity,
          price: `${Number(item.price).toFixed(4)} ${item.currency}`,
          variantName: item.variantName,
        })),
      })),
    });
  } catch (error) {
    console.error('Merchant orders error:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}
