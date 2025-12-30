// app/api/merchant/trades/route.ts
// Get merchant's received trade offers

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
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    // Get trade offers for this merchant's store
    // Exclude CANCELLED trades from the default view (they get removed)
    const statusFilter = status && status !== 'all'
      ? { status: status as any }
      : { status: { not: 'CANCELLED' as any } };

    const trades = await prisma.tradeOffer.findMany({
      where: {
        storeId: store.id,
        merchantId: user.id,
        ...statusFilter,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            images: true,
            priceSol: true,
            priceUsdc: true,
          },
        },
        buyer: {
          select: {
            id: true,
            name: true,
            walletAddress: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get stats
    const stats = await prisma.tradeOffer.groupBy({
      by: ['status'],
      where: {
        storeId: store.id,
        merchantId: user.id,
      },
      _count: true,
    });

    const statsMap: Record<string, number> = {
      PENDING: 0,
      ACCEPTED: 0,
      DECLINED: 0,
      CANCELLED: 0,
      COMPLETED: 0,
    };
    stats.forEach((s) => {
      statsMap[s.status] = s._count;
    });

    return NextResponse.json({
      success: true,
      trades: trades.map((trade) => ({
        id: trade.id,
        status: trade.status,
        offerDescription: trade.offerDescription,
        offerAmount: trade.offerAmount ? Number(trade.offerAmount) : null,
        offerImages: trade.offerImages,
        buyerMessage: trade.buyerMessage,
        merchantReply: trade.merchantReply,
        viewedAt: trade.viewedAt?.toISOString() || null,
        respondedAt: trade.respondedAt?.toISOString() || null,
        createdAt: trade.createdAt.toISOString(),
        updatedAt: trade.updatedAt.toISOString(),
        isNew: !trade.viewedAt,
        product: {
          id: trade.product.id,
          name: trade.product.name,
          slug: trade.product.slug,
          image: trade.product.images?.[0] || null,
          priceSol: Number(trade.product.priceSol),
          priceUsdc: trade.product.priceUsdc ? Number(trade.product.priceUsdc) : null,
        },
        buyer: {
          id: trade.buyer.id,
          name: trade.buyer.name || trade.buyer.walletAddress?.slice(0, 8),
          walletAddress: trade.buyer.walletAddress,
          avatarUrl: trade.buyer.avatarUrl,
        },
      })),
      stats: {
        pending: statsMap.PENDING,
        accepted: statsMap.ACCEPTED,
        declined: statsMap.DECLINED,
        cancelled: statsMap.CANCELLED,
        completed: statsMap.COMPLETED,
        total: Object.values(statsMap).reduce((a, b) => a + b, 0),
      },
      store: {
        id: store.id,
        name: store.name,
        tradesEnabled: store.tradesEnabled,
      },
    });
  } catch (error) {
    console.error('Merchant trades error:', error);
    return NextResponse.json({ error: 'Failed to fetch trades' }, { status: 500 });
  }
}

// PATCH - Toggle trades enabled/disabled for store
export async function PATCH(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    if (!walletAddress) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
    const body = await request.json();
    const { tradesEnabled } = body;

    const updatedStore = await prisma.store.update({
      where: { id: store.id },
      data: { tradesEnabled: Boolean(tradesEnabled) },
    });

    return NextResponse.json({
      success: true,
      tradesEnabled: updatedStore.tradesEnabled,
    });
  } catch (error) {
    console.error('Toggle trades error:', error);
    return NextResponse.json({ error: 'Failed to update trades setting' }, { status: 500 });
  }
}
