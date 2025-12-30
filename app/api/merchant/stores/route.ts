// app/api/merchant/stores/route.ts
// Get all stores for the current merchant

import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for auth headers
export const dynamic = 'force-dynamic';

import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// GET all merchant's stores
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    console.log('[Merchant Stores API] User:', user.id, user.walletAddress);

    // Get all stores owned by this user
    const stores = await prisma.store.findMany({
      where: { ownerId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            products: true,
            orders: true,
          },
        },
      },
    });

    console.log('[Merchant Stores API] Found stores:', stores.length);

    return NextResponse.json({
      success: true,
      stores: stores.map((store) => ({
        id: store.id,
        name: store.name,
        slug: store.slug,
        description: store.description,
        logoUrl: store.logoUrl,
        bannerUrl: store.bannerUrl,
        status: store.status,
        payoutWallet: store.payoutWallet,
        websiteUrl: store.websiteUrl,
        twitterUrl: store.twitterUrl,
        discordUrl: store.discordUrl,
        totalSales: Number(store.totalSales),
        totalOrders: store.totalOrders,
        productCount: store._count.products,
        orderCount: store._count.orders,
        createdAt: store.createdAt,
      })),
    });

  } catch (error: any) {
    console.error('Error fetching merchant stores:', error);
    console.error('Error stack:', error?.stack);
    console.error('Error message:', error?.message);
    return NextResponse.json(
      { error: 'Failed to fetch stores', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
