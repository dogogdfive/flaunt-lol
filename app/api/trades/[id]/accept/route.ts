// app/api/trades/[id]/accept/route.ts
// Merchant accepts a trade offer

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { notifyTradeAccepted } from '@/lib/notifications';

export async function POST(
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
            name: true,
          },
        },
        store: {
          select: {
            name: true,
            ownerId: true,
          },
        },
      },
    });

    if (!trade) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
    }

    // Only merchant can accept
    if (trade.merchantId !== user.id) {
      return NextResponse.json({ error: 'Only the merchant can accept' }, { status: 403 });
    }

    // Can only accept pending trades
    if (trade.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Can only accept pending trade offers' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { merchantReply } = body;

    const updatedTrade = await prisma.tradeOffer.update({
      where: { id },
      data: {
        status: 'ACCEPTED',
        merchantReply: merchantReply || null,
        respondedAt: new Date(),
      },
    });

    // Notify the buyer
    await notifyTradeAccepted(
      trade.buyerId,
      trade.id,
      trade.product.name,
      trade.store.name
    );

    return NextResponse.json({
      success: true,
      trade: {
        id: updatedTrade.id,
        status: updatedTrade.status,
        respondedAt: updatedTrade.respondedAt?.toISOString(),
      },
    });
  } catch (error) {
    console.error('Accept trade error:', error);
    return NextResponse.json({ error: 'Failed to accept trade' }, { status: 500 });
  }
}
