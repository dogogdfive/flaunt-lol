// app/api/trades/[id]/route.ts
// Get single trade and update trade offer

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - Get a single trade offer
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const walletAddress = request.headers.get('x-wallet-address');
    if (!walletAddress) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findFirst({
      where: { walletAddress },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const trade = await prisma.tradeOffer.findUnique({
      where: { id },
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
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
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
        merchant: {
          select: {
            id: true,
            name: true,
            walletAddress: true,
          },
        },
      },
    });

    if (!trade) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
    }

    // Only buyer or merchant can view
    if (trade.buyerId !== user.id && trade.merchantId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Mark as viewed if merchant is viewing for first time
    if (trade.merchantId === user.id && !trade.viewedAt) {
      await prisma.tradeOffer.update({
        where: { id },
        data: { viewedAt: new Date() },
      });
    }

    return NextResponse.json({
      success: true,
      trade: {
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
        isBuyer: trade.buyerId === user.id,
        isMerchant: trade.merchantId === user.id,
        product: {
          id: trade.product.id,
          name: trade.product.name,
          slug: trade.product.slug,
          image: trade.product.images?.[0] || null,
          priceSol: Number(trade.product.priceSol),
          priceUsdc: trade.product.priceUsdc ? Number(trade.product.priceUsdc) : null,
        },
        store: {
          id: trade.store.id,
          name: trade.store.name,
          slug: trade.store.slug,
          logoUrl: trade.store.logoUrl,
        },
        buyer: {
          id: trade.buyer.id,
          name: trade.buyer.name || trade.buyer.walletAddress?.slice(0, 8),
          walletAddress: trade.buyer.walletAddress,
          avatarUrl: trade.buyer.avatarUrl,
        },
      },
    });
  } catch (error) {
    console.error('Get trade error:', error);
    return NextResponse.json({ error: 'Failed to fetch trade' }, { status: 500 });
  }
}

// PATCH - Update trade offer (buyer can update their offer if still pending)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const walletAddress = request.headers.get('x-wallet-address');
    if (!walletAddress) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findFirst({
      where: { walletAddress },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const trade = await prisma.tradeOffer.findUnique({
      where: { id },
    });

    if (!trade) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
    }

    // Only buyer can update
    if (trade.buyerId !== user.id) {
      return NextResponse.json({ error: 'Only the buyer can update the offer' }, { status: 403 });
    }

    // Can only update if pending
    if (trade.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Can only update pending trade offers' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { offerDescription, offerAmount, offerImages, buyerMessage } = body;

    const updatedTrade = await prisma.tradeOffer.update({
      where: { id },
      data: {
        ...(offerDescription && { offerDescription }),
        ...(offerAmount !== undefined && { offerAmount: offerAmount ? parseFloat(offerAmount) : null }),
        ...(offerImages && { offerImages }),
        ...(buyerMessage !== undefined && { buyerMessage }),
      },
      include: {
        product: {
          select: {
            name: true,
          },
        },
        store: {
          select: {
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      trade: {
        id: updatedTrade.id,
        status: updatedTrade.status,
        offerDescription: updatedTrade.offerDescription,
        offerAmount: updatedTrade.offerAmount ? Number(updatedTrade.offerAmount) : null,
        offerImages: updatedTrade.offerImages,
        buyerMessage: updatedTrade.buyerMessage,
        updatedAt: updatedTrade.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Update trade error:', error);
    return NextResponse.json({ error: 'Failed to update trade' }, { status: 500 });
  }
}
