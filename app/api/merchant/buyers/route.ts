// app/api/merchant/buyers/route.ts
// Get buyers who have ordered from merchant's stores

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireMerchant } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await requireMerchant();

    // Get merchant's stores
    const stores = await prisma.store.findMany({
      where: { ownerId: user.id },
      select: { id: true },
    });

    const storeIds = stores.map(s => s.id);

    if (storeIds.length === 0) {
      return NextResponse.json({
        success: true,
        buyers: [],
      });
    }

    // Get unique buyers who have ordered from merchant's stores
    const orders = await prisma.order.findMany({
      where: {
        storeId: { in: storeIds },
        paymentStatus: 'COMPLETED',
      },
      select: {
        customerId: true,
        customer: {
          select: {
            id: true,
            walletAddress: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Aggregate buyers with order count
    const buyerMap = new Map<string, {
      id: string;
      walletAddress?: string;
      name?: string;
      email?: string;
      orderCount: number;
    }>();

    for (const order of orders) {
      if (order.customer) {
        const existing = buyerMap.get(order.customer.id);
        if (existing) {
          existing.orderCount++;
        } else {
          buyerMap.set(order.customer.id, {
            id: order.customer.id,
            walletAddress: order.customer.walletAddress || undefined,
            name: order.customer.name || undefined,
            email: order.customer.email || undefined,
            orderCount: 1,
          });
        }
      }
    }

    const buyers = Array.from(buyerMap.values()).sort((a, b) => b.orderCount - a.orderCount);

    return NextResponse.json({
      success: true,
      buyers,
    });

  } catch (error) {
    console.error('Error fetching buyers:', error);

    if (error instanceof Error && error.message === 'Merchant access required') {
      return NextResponse.json(
        { error: 'Merchant access required' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch buyers' },
      { status: 500 }
    );
  }
}
