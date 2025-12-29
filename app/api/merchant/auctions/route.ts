// app/api/merchant/auctions/route.ts
// Merchant auction management

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { calculateCurrentPrice, calculateTemperature, getTimeRemaining } from '@/lib/auction-pricing';
import { getViewerCount } from '@/lib/auction-viewers';

export const dynamic = 'force-dynamic';

// GET: List merchant's auctions
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
      include: {
        stores: {
          where: { status: 'APPROVED' },
          select: { id: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const storeId = searchParams.get('storeId');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = { merchantId: user.id };

    if (status && status !== 'all') {
      where.status = status;
    }

    if (storeId) {
      where.storeId = storeId;
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
            },
          },
          winner: {
            select: {
              id: true,
              name: true,
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
        currentPriceSol: calculateCurrentPrice(pricing),
        temperature: calculateTemperature(pricing),
        timeRemaining: getTimeRemaining(pricing),
        viewerCount: getViewerCount(auction.id),
        messageCount: auction._count.messages,
      };
    });

    // Calculate stats
    const stats = {
      total,
      live: auctions.filter((a) => a.status === 'LIVE').length,
      scheduled: auctions.filter((a) => a.status === 'SCHEDULED').length,
      sold: auctions.filter((a) => a.status === 'SOLD').length,
      totalRevenue: auctions
        .filter((a) => a.status === 'SOLD' && a.winningPriceSol)
        .reduce((sum, a) => sum + Number(a.winningPriceSol), 0),
    };

    return NextResponse.json({
      success: true,
      auctions: enrichedAuctions,
      stats,
      total,
      hasMore: offset + auctions.length < total,
    });
  } catch (error) {
    console.error('Error fetching merchant auctions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch auctions' },
      { status: 500 }
    );
  }
}
