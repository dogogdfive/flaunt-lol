// app/api/auctions/[id]/route.ts
// Individual auction operations

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { calculateCurrentPrice, calculateTemperature, getTimeRemaining } from '@/lib/auction-pricing';
import { getViewerCount } from '@/lib/auction-viewers';

export const dynamic = 'force-dynamic';

// GET: Get auction details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Support both ID and slug lookup
    const auction = await prisma.auction.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            bannerUrl: true,
            isVerified: true,
            description: true,
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
        winner: {
          select: {
            id: true,
            name: true,
            username: true,
            walletAddress: true,
          },
        },
      },
    });

    if (!auction) {
      return NextResponse.json(
        { error: 'Auction not found' },
        { status: 404 }
      );
    }

    // Calculate real-time values
    const pricing = {
      startPriceSol: Number(auction.startPriceSol),
      floorPriceSol: Number(auction.floorPriceSol),
      decayType: auction.decayType,
      decaySteps: auction.decaySteps as any,
      durationMinutes: auction.durationMinutes,
      startsAt: auction.startsAt,
    };

    const enrichedAuction = {
      ...auction,
      startPriceSol: Number(auction.startPriceSol),
      startPriceUsdc: auction.startPriceUsdc ? Number(auction.startPriceUsdc) : null,
      floorPriceSol: Number(auction.floorPriceSol),
      floorPriceUsdc: auction.floorPriceUsdc ? Number(auction.floorPriceUsdc) : null,
      winningPriceSol: auction.winningPriceSol ? Number(auction.winningPriceSol) : null,
      winningPriceUsdc: auction.winningPriceUsdc ? Number(auction.winningPriceUsdc) : null,
      currentPriceSol: calculateCurrentPrice(pricing),
      temperature: calculateTemperature(pricing),
      timeRemaining: getTimeRemaining(pricing),
      viewerCount: getViewerCount(auction.id),
    };

    return NextResponse.json({
      success: true,
      auction: enrichedAuction,
    });
  } catch (error) {
    console.error('Error fetching auction:', error);
    return NextResponse.json(
      { error: 'Failed to fetch auction' },
      { status: 500 }
    );
  }
}

// PATCH: Update auction (merchant only, before it starts)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const auction = await prisma.auction.findUnique({
      where: { id: params.id },
    });

    if (!auction) {
      return NextResponse.json(
        { error: 'Auction not found' },
        { status: 404 }
      );
    }

    // Check ownership
    if (auction.merchantId !== user.id && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      );
    }

    // Only allow updates for DRAFT or SCHEDULED auctions
    if (!['DRAFT', 'SCHEDULED'].includes(auction.status)) {
      return NextResponse.json(
        { error: 'Cannot update an active or ended auction' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
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
      status,
    } = body;

    const updateData: any = {};

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (images !== undefined) updateData.images = images;
    if (videoUrl !== undefined) updateData.videoUrl = videoUrl;
    if (startPriceSol !== undefined) updateData.startPriceSol = startPriceSol;
    if (startPriceUsdc !== undefined) updateData.startPriceUsdc = startPriceUsdc;
    if (floorPriceSol !== undefined) updateData.floorPriceSol = floorPriceSol;
    if (floorPriceUsdc !== undefined) updateData.floorPriceUsdc = floorPriceUsdc;
    if (decayType !== undefined) updateData.decayType = decayType;
    if (decaySteps !== undefined) updateData.decaySteps = decaySteps;
    if (durationMinutes !== undefined) updateData.durationMinutes = durationMinutes;
    if (quantity !== undefined) updateData.quantity = quantity;

    if (startsAt !== undefined) {
      const startDate = new Date(startsAt);
      updateData.startsAt = startDate;
      updateData.endsAt = new Date(
        startDate.getTime() + (durationMinutes || auction.durationMinutes) * 60 * 1000
      );
    }

    // Allow changing status from DRAFT to SCHEDULED
    if (status !== undefined && ['DRAFT', 'SCHEDULED'].includes(status)) {
      updateData.status = status;
    }

    const updatedAuction = await prisma.auction.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      auction: {
        ...updatedAuction,
        startPriceSol: Number(updatedAuction.startPriceSol),
        floorPriceSol: Number(updatedAuction.floorPriceSol),
      },
    });
  } catch (error) {
    console.error('Error updating auction:', error);
    return NextResponse.json(
      { error: 'Failed to update auction' },
      { status: 500 }
    );
  }
}

// DELETE: Cancel auction (merchant only, before it sells)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const auction = await prisma.auction.findUnique({
      where: { id: params.id },
    });

    if (!auction) {
      return NextResponse.json(
        { error: 'Auction not found' },
        { status: 404 }
      );
    }

    // Check ownership (or admin)
    if (auction.merchantId !== user.id && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      );
    }

    // Can't cancel a sold auction
    if (auction.status === 'SOLD') {
      return NextResponse.json(
        { error: 'Cannot cancel a sold auction' },
        { status: 400 }
      );
    }

    // Update status to cancelled
    await prisma.auction.update({
      where: { id: params.id },
      data: { status: 'CANCELLED' },
    });

    return NextResponse.json({
      success: true,
      message: 'Auction cancelled',
    });
  } catch (error) {
    console.error('Error cancelling auction:', error);
    return NextResponse.json(
      { error: 'Failed to cancel auction' },
      { status: 500 }
    );
  }
}
