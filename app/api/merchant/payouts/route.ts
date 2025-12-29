// app/api/merchant/payouts/route.ts
// Get merchant's payout history and pending amounts

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Fetch platform fee from database
async function getPlatformFeePercent(): Promise<number> {
  const setting = await prisma.platformSettings.findUnique({
    where: { key: 'platform_fee_percent' },
  });
  if (setting?.value && typeof setting.value === 'object' && 'value' in setting.value) {
    return Number((setting.value as { value: number }).value) || 3.5;
  }
  return 3.5;
}

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

    // Get completed payouts
    const payouts = await prisma.payout.findMany({
      where: { storeId: store.id },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate pending payout amount
    // Orders eligible for payout: CONFIRMED or 14+ days since shipped/delivered, with tracking
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const eligibleOrders = await prisma.order.findMany({
      where: {
        storeId: store.id,
        paymentStatus: 'COMPLETED',
        payoutId: null,
        trackingNumber: { not: null },
        status: { in: ['CONFIRMED', 'SHIPPED', 'DELIVERED'] },
        OR: [
          { status: 'CONFIRMED' },
          { status: 'SHIPPED', shippedAt: { lt: fourteenDaysAgo } },
          { status: 'DELIVERED', deliveredAt: { lt: fourteenDaysAgo } },
        ],
      },
      select: {
        id: true,
        orderNumber: true,
        merchantAmount: true,
        paymentCurrency: true,
        status: true,
        createdAt: true,
      },
    });

    const pendingAmount = eligibleOrders.reduce((sum, o) => sum + Number(o.merchantAmount), 0);

    // Get orders without tracking (not eligible for payout)
    const ordersWithoutTracking = await prisma.order.count({
      where: {
        storeId: store.id,
        paymentStatus: 'COMPLETED',
        payoutId: null,
        trackingNumber: null,
        status: { in: ['PAID', 'PROCESSING', 'SHIPPED'] },
      },
    });

    // Total paid out
    const totalPaidOut = payouts
      .filter(p => p.status === 'COMPLETED')
      .reduce((sum, p) => sum + Number(p.amount), 0);

    // Get platform fee
    const platformFeePercent = await getPlatformFeePercent();

    return NextResponse.json({
      success: true,
      payouts: payouts.map((payout) => ({
        id: payout.id,
        amount: Number(payout.amount),
        currency: payout.currency,
        status: payout.status,
        orderCount: payout.orderCount,
        txSignature: payout.txSignature,
        walletAddress: payout.walletAddress,
        periodStart: payout.periodStart?.toISOString() || null,
        periodEnd: payout.periodEnd?.toISOString() || null,
        processedAt: payout.processedAt?.toISOString() || null,
        createdAt: payout.createdAt.toISOString(),
      })),
      summary: {
        pendingAmount: Math.round(pendingAmount * 10000) / 10000,
        eligibleOrderCount: eligibleOrders.length,
        ordersWithoutTracking,
        totalPaidOut: Math.round(totalPaidOut * 10000) / 10000,
        payoutWallet: store.payoutWallet,
        currency: eligibleOrders[0]?.paymentCurrency || payouts[0]?.currency || 'SOL',
        platformFeePercent,
      },
      eligibleOrders: eligibleOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        amount: Number(o.merchantAmount),
        status: o.status,
        createdAt: o.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Payouts error:', error);
    return NextResponse.json({ error: 'Failed to fetch payouts' }, { status: 500 });
  }
}
