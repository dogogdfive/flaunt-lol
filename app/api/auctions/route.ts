// app/api/auctions/route.ts
// Public auction listing and creation

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { calculateCurrentPrice, calculateTemperature, getTimeRemaining } from '@/lib/auction-pricing';
import { getViewerCount } from '@/lib/auction-viewers';

export const dynamic = 'force-dynamic';

// GET: List all live/upcoming auctions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // LIVE, SCHEDULED, or all
    const storeId = searchParams.get('storeId');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {};

    if (status === 'LIVE') {
      where.status = 'LIVE';
    } else if (status === 'SCHEDULED') {
      where.status = 'SCHEDULED';
    } else {
      // Default: show live and scheduled
      where.status = { in: ['LIVE', 'SCHEDULED'] };
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
              logoUrl: true,
              isVerified: true,
            },
          },
          merchant: {
            select: {
              id: true,
              name: true,
              username: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: [
          { status: 'asc' }, // LIVE first
          { startsAt: 'asc' },
        ],
        take: limit,
        skip: offset,
      }),
      prisma.auction.count({ where }),
    ]);

    // Enrich auctions with real-time data
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
        startPriceUsdc: auction.startPriceUsdc ? Number(auction.startPriceUsdc) : null,
        floorPriceSol: Number(auction.floorPriceSol),
        floorPriceUsdc: auction.floorPriceUsdc ? Number(auction.floorPriceUsdc) : null,
        currentPriceSol: calculateCurrentPrice(pricing),
        temperature: calculateTemperature(pricing),
        timeRemaining: getTimeRemaining(pricing),
        viewerCount: getViewerCount(auction.id),
      };
    });

    return NextResponse.json({
      success: true,
      auctions: enrichedAuctions,
      total,
      hasMore: offset + auctions.length < total,
    });
  } catch (error) {
    console.error('Error fetching auctions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch auctions' },
      { status: 500 }
    );
  }
}

// POST: Create a new auction (merchant only)
export async function POST(request: NextRequest) {
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

    if (user.stores.length === 0) {
      return NextResponse.json(
        { error: 'You need an approved store to create auctions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      storeId,
      title,
      description,
      images,
      videoUrl,
      startPriceSol,
      startPriceUsdc,
      floorPriceSol,
      floorPriceUsdc,
      decayType,
      decaySteps,
      durationMinutes,
      startsAt,
      quantity,
    } = body;

    // Validate required fields - accept either SOL or USDC pricing
    const hasStartPrice = startPriceSol || startPriceUsdc;
    const hasFloorPrice = floorPriceSol || floorPriceUsdc;

    if (!storeId || !title || !hasStartPrice || !hasFloorPrice || !durationMinutes || !startsAt) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify store ownership
    const store = await prisma.store.findFirst({
      where: {
        id: storeId,
        ownerId: user.id,
        status: 'APPROVED',
      },
    });

    if (!store) {
      return NextResponse.json(
        { error: 'Store not found or not authorized' },
        { status: 403 }
      );
    }

    // Validate pricing (check both SOL and USDC if provided)
    const startPrice = startPriceUsdc || startPriceSol;
    const floorPrice = floorPriceUsdc || floorPriceSol;
    if (floorPrice >= startPrice) {
      return NextResponse.json(
        { error: 'Floor price must be less than start price' },
        { status: 400 }
      );
    }

    // Generate slug
    const baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const timestamp = Date.now().toString(36);
    const slug = `${baseSlug}-${timestamp}`;

    // Calculate end time
    const startDate = new Date(startsAt);
    const endsAt = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

    // Determine initial status
    const now = new Date();
    const status = startDate <= now ? 'LIVE' : 'SCHEDULED';

    const auction = await prisma.auction.create({
      data: {
        merchantId: user.id,
        storeId,
        title,
        slug,
        description: description || null,
        images: images || [],
        videoUrl: videoUrl || null,
        startPriceSol,
        startPriceUsdc: startPriceUsdc || null,
        floorPriceSol,
        floorPriceUsdc: floorPriceUsdc || null,
        decayType: decayType || 'LINEAR',
        decaySteps: decaySteps || null,
        durationMinutes,
        startsAt: startDate,
        endsAt,
        status,
        quantity: quantity || 1,
      },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      auction: {
        ...auction,
        startPriceSol: Number(auction.startPriceSol),
        floorPriceSol: Number(auction.floorPriceSol),
      },
    });
  } catch (error) {
    console.error('Error creating auction:', error);
    return NextResponse.json(
      { error: 'Failed to create auction' },
      { status: 500 }
    );
  }
}
