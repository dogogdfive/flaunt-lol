// app/api/admin/auctions/route.ts
// Admin auction overview with full history

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { calculateCurrentPrice, calculateTemperature, getTimeRemaining } from '@/lib/auction-pricing';
import { getViewerCount, getGlobalStats } from '@/lib/auction-viewers';

export const dynamic = 'force-dynamic';

// GET: List all auctions (admin only)
export async function GET(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet not connected' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { walletAddress },
    });

    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const storeId = searchParams.get('storeId');
    const merchantId = searchParams.get('merchantId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {};

    if (status && status !== 'all') {
      where.status = status;
    }

    if (storeId) {
      where.storeId = storeId;
    }

    if (merchantId) {
      where.merchantId = merchantId;
    }

    const [auctions, total] = await Promise.all([
      prisma.auction.findMany({
        where,
        include: {
          store: {
            select: {
              id: true,
              name: true,
              slug: true,
              isVerified: true,
            },
          },
          merchant: {
            select: {
              id: true,
              name: true,
              username: true,
              walletAddress: true,
            },
          },
          winner: {
            select: {
              id: true,
              name: true,
              username: true,
              walletAddress: true,
            },
          },
          _count: {
            select: { messages: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.auction.count({ where }),
    ]);

    // Enrich with real-time data
    const enrichedAuctions = auctions.map((auction) => {
      const pricing = {
        startPriceSol: Number(auction.startPriceSol),
        floorPriceSol: Number(auction.floorPriceSol),
        decayType: auction.decayType,
        decaySteps: auction.decaySteps as any,
        durationMinutes: auction.durationMinutes,
        startsAt: auction.startsAt,
      };

      return {
        ...auction,
        startPriceSol: Number(auction.startPriceSol),
        floorPriceSol: Number(auction.floorPriceSol),
        winningPriceSol: auction.winningPriceSol ? Number(auction.winningPriceSol) : null,
        winningPriceUsdc: auction.winningPriceUsdc ? Number(auction.winningPriceUsdc) : null,
        currentPriceSol: calculateCurrentPrice(pricing),
        temperature: calculateTemperature(pricing),
        timeRemaining: getTimeRemaining(pricing),
        viewerCount: getViewerCount(auction.id),
        messageCount: auction._count.messages,
      };
    });

    // Get aggregate stats
    const [statusCounts, revenueStats] = await Promise.all([
      prisma.auction.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      prisma.auction.aggregate({
        where: { status: 'SOLD' },
        _sum: { winningPriceSol: true },
        _count: { id: true },
      }),
    ]);

    // Get viewer stats
    const viewerStats = getGlobalStats();

    const stats = {
      total,
      byStatus: statusCounts.reduce(
        (acc, item) => ({ ...acc, [item.status]: item._count.id }),
        {} as Record<string, number>
      ),
      totalRevenueSol: Number(revenueStats._sum.winningPriceSol || 0),
      totalSold: revenueStats._count.id,
      activeViewers: viewerStats.totalViewers,
      activeAuctions: viewerStats.activeAuctions,
    };

    return NextResponse.json({
      success: true,
      auctions: enrichedAuctions,
      stats,
      total,
      hasMore: offset + auctions.length < total,
    });
  } catch (error) {
    console.error('Error fetching admin auctions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch auctions' },
      { status: 500 }
    );
  }
}
