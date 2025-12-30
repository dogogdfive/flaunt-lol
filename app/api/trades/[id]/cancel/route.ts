// app/api/trades/[id]/cancel/route.ts
// Cancel a trade offer (buyer can cancel pending, merchant can cancel pending/accepted)

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { notifyTradeCancelled } from '@/lib/notifications';

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
          },
        },
        buyer: {
          select: {
            name: true,
            walletAddress: true,
          },
        },
      },
    });

    if (!trade) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
    }

    const isBuyer = trade.buyerId === user.id;
    const isMerchant = trade.merchantId === user.id;

    if (!isBuyer && !isMerchant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Buyers can cancel pending offers
    // Merchants can cancel pending or accepted offers
    const allowedStatuses = isBuyer ? ['PENDING'] : ['PENDING', 'ACCEPTED'];
    if (!allowedStatuses.includes(trade.status)) {
      return NextResponse.json(
        { error: `Cannot cancel a ${trade.status.toLowerCase()} trade offer` },
        { status: 400 }
      );
    }

    const updatedTrade = await prisma.tradeOffer.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        respondedAt: trade.respondedAt || new Date(),
      },
    });

    // Notify the other party
    const recipientId = isBuyer ? trade.merchantId : trade.buyerId;
    const cancellerName = isBuyer
      ? (trade.buyer.name || trade.buyer.walletAddress?.slice(0, 8) || 'Buyer')
      : trade.store.name;

    await notifyTradeCancelled(
      recipientId,
      trade.id,
      trade.product.name,
      cancellerName
    );

    return NextResponse.json({
      success: true,
      trade: {
        id: updatedTrade.id,
        status: updatedTrade.status,
      },
    });
  } catch (error) {
    console.error('Cancel trade error:', error);
    return NextResponse.json({ error: 'Failed to cancel trade' }, { status: 500 });
  }
}
