// app/api/trades/[id]/decline/route.ts
// Merchant declines a trade offer

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { notifyTradeDeclined } from '@/lib/notifications';

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

    // Only merchant can decline
    if (trade.merchantId !== user.id) {
      return NextResponse.json({ error: 'Only the merchant can decline' }, { status: 403 });
    }

    // Can only decline pending trades
    if (trade.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Can only decline pending trade offers' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { merchantReply, reason } = body;

    const updatedTrade = await prisma.tradeOffer.update({
      where: { id },
      data: {
        status: 'DECLINED',
        merchantReply: merchantReply || reason || null,
        respondedAt: new Date(),
      },
    });

    // Notify the buyer
    await notifyTradeDeclined(
      trade.buyerId,
      trade.id,
      trade.product.name,
      trade.store.name,
      merchantReply || reason
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
    console.error('Decline trade error:', error);
    return NextResponse.json({ error: 'Failed to decline trade' }, { status: 500 });
  }
}
