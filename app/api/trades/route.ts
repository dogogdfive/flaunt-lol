// app/api/trades/route.ts
// Create trade offer and list user's trade offers

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { notifyTradeReceived } from '@/lib/notifications';

// POST - Create a new trade offer
export async function POST(request: NextRequest) {
  try {
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

    const body = await request.json();
    const { productId, offerDescription, offerAmount, offerImages, buyerMessage } = body;

    if (!productId || !offerDescription) {
      return NextResponse.json(
        { error: 'Product ID and offer description are required' },
        { status: 400 }
      );
    }

    // Get product with store info
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        store: {
          include: {
            owner: true,
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    if (product.status !== 'APPROVED') {
      return NextResponse.json({ error: 'Product not available' }, { status: 400 });
    }

    if (!product.store.tradesEnabled) {
      return NextResponse.json(
        { error: 'This store does not accept trade offers' },
        { status: 400 }
      );
    }

    // Can't trade with yourself
    if (product.store.ownerId === user.id) {
      return NextResponse.json(
        { error: 'You cannot trade with your own store' },
        { status: 400 }
      );
    }

    // Check if user already has a pending trade for this product
    const existingTrade = await prisma.tradeOffer.findFirst({
      where: {
        buyerId: user.id,
        productId,
        status: 'PENDING',
      },
    });

    if (existingTrade) {
      return NextResponse.json(
        { error: 'You already have a pending trade offer for this product' },
        { status: 400 }
      );
    }

    // Create the trade offer
    const tradeOffer = await prisma.tradeOffer.create({
      data: {
        buyerId: user.id,
        merchantId: product.store.ownerId,
        storeId: product.storeId,
        productId,
        offerDescription,
        offerAmount: offerAmount ? parseFloat(offerAmount) : null,
        offerImages: offerImages || [],
        buyerMessage: buyerMessage || null,
      },
      include: {
        product: {
          select: {
            name: true,
            images: true,
          },
        },
        store: {
          select: {
            name: true,
          },
        },
      },
    });

    // Notify the merchant
    await notifyTradeReceived(
      product.store.ownerId,
      tradeOffer.id,
      product.name,
      user.name || user.walletAddress?.slice(0, 8) || 'A buyer'
    );

    return NextResponse.json({
      success: true,
      trade: {
        id: tradeOffer.id,
        status: tradeOffer.status,
        productName: tradeOffer.product.name,
        storeName: tradeOffer.store.name,
        createdAt: tradeOffer.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Create trade offer error:', error);
    return NextResponse.json({ error: 'Failed to create trade offer' }, { status: 500 });
  }
}

// GET - List user's trade offers (as buyer)
export async function GET(request: NextRequest) {
  try {
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const trades = await prisma.tradeOffer.findMany({
      where: {
        buyerId: user.id,
        ...(status && status !== 'all' ? { status: status as any } : {}),
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
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
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
      })),
    });
  } catch (error) {
    console.error('List trades error:', error);
    return NextResponse.json({ error: 'Failed to fetch trades' }, { status: 500 });
  }
}
