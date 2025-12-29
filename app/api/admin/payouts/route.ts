// app/api/admin/payouts/route.ts
// Admin API to fetch all payouts and process payouts

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { createNotification } from '@/lib/notifications';

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

// POST - Process a payout for a store
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();

    const { storeId, txSignature } = body;

    if (!storeId || !txSignature) {
      return NextResponse.json(
        { error: 'Store ID and transaction signature are required' },
        { status: 400 }
      );
    }

    // Get store details
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: {
        id: true,
        name: true,
        ownerId: true,
        payoutWallet: true,
      },
    });

    if (!store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }

    if (!store.payoutWallet) {
      return NextResponse.json(
        { error: 'Store has no payout wallet configured' },
        { status: 400 }
      );
    }

    // Get eligible orders for payout
    // Orders must have tracking number to be eligible!
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const eligibleOrders = await prisma.order.findMany({
      where: {
        storeId,
        paymentStatus: 'COMPLETED',
        payoutId: null,
        trackingNumber: { not: null }, // MUST have tracking number!
        status: {
          in: ['CONFIRMED', 'SHIPPED', 'DELIVERED'],
        },
        OR: [
          { status: 'CONFIRMED' },
          {
            status: 'SHIPPED',
            shippedAt: { lt: fourteenDaysAgo },
          },
          {
            status: 'DELIVERED',
            deliveredAt: { lt: fourteenDaysAgo },
          },
        ],
      },
    });

    if (eligibleOrders.length === 0) {
      return NextResponse.json(
        { error: 'No eligible orders for payout' },
        { status: 400 }
      );
    }

    // Calculate total amount
    const totalAmount = eligibleOrders.reduce(
      (sum, order) => sum + Number(order.merchantAmount),
      0
    );

    // Get oldest and newest order dates for period
    const sortedOrders = [...eligibleOrders].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );
    const periodStart = sortedOrders[0].createdAt;
    const periodEnd = sortedOrders[sortedOrders.length - 1].createdAt;

    // Determine currency (assume all orders same currency, use first)
    const currency = eligibleOrders[0].paymentCurrency;

    // Create payout record
    const payout = await prisma.payout.create({
      data: {
        storeId,
        amount: totalAmount,
        currency,
        status: 'COMPLETED',
        walletAddress: store.payoutWallet,
        txSignature,
        periodStart,
        periodEnd,
        orderCount: eligibleOrders.length,
        processedById: admin.id,
        processedAt: new Date(),
      },
    });

    // Link orders to payout
    await prisma.order.updateMany({
      where: {
        id: { in: eligibleOrders.map((o) => o.id) },
      },
      data: {
        payoutId: payout.id,
      },
    });

    // Notify merchant
    await createNotification({
      userId: store.ownerId,
      type: 'PAYOUT_COMPLETED',
      title: 'Payout Completed',
      message: `Your payout of ${totalAmount.toFixed(4)} ${currency} for ${eligibleOrders.length} orders has been sent.`,
      metadata: {
        payoutId: payout.id,
        amount: totalAmount,
        currency,
        txSignature,
      },
    });

    return NextResponse.json({
      success: true,
      payout: {
        id: payout.id,
        amount: totalAmount,
        currency,
        orderCount: eligibleOrders.length,
        txSignature,
      },
    });
  } catch (error) {
    console.error('Admin payout processing error:', error);

    if (error instanceof Error && error.message === 'Admin access required') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to process payout' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    // Get all completed payouts
    const payouts = await prisma.payout.findMany({
      include: {
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
            payoutWallet: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate pending payouts per store
    // Orders that are CONFIRMED or auto-confirmable (14 days after ship/deliver)
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const pendingOrders = await prisma.order.findMany({
      where: {
        paymentStatus: 'COMPLETED',
        payoutId: null,
        trackingNumber: { not: null }, // Must have tracking to be eligible
        status: {
          in: ['CONFIRMED', 'SHIPPED', 'DELIVERED'],
        },
        OR: [
          { status: 'CONFIRMED' },
          {
            status: 'SHIPPED',
            shippedAt: { lt: fourteenDaysAgo },
          },
          {
            status: 'DELIVERED',
            deliveredAt: { lt: fourteenDaysAgo },
          },
        ],
      },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
            payoutWallet: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by store
    const pendingByStore = new Map<string, {
      storeId: string;
      storeName: string;
      storeSlug: string;
      payoutWallet: string | null;
      pendingAmount: number;
      orderCount: number;
      oldestOrderDate: Date;
    }>();

    for (const order of pendingOrders) {
      const existing = pendingByStore.get(order.storeId);
      if (existing) {
        existing.pendingAmount += Number(order.merchantAmount);
        existing.orderCount += 1;
        if (order.createdAt < existing.oldestOrderDate) {
          existing.oldestOrderDate = order.createdAt;
        }
      } else {
        pendingByStore.set(order.storeId, {
          storeId: order.storeId,
          storeName: order.store.name,
          storeSlug: order.store.slug,
          payoutWallet: order.store.payoutWallet,
          pendingAmount: Number(order.merchantAmount),
          orderCount: 1,
          oldestOrderDate: order.createdAt,
        });
      }
    }

    // Get platform fee for display
    const platformFeePercent = await getPlatformFeePercent();

    return NextResponse.json({
      success: true,
      platformFeePercent,
      payouts: payouts.map((payout) => ({
        id: payout.id,
        store: payout.store,
        amount: Number(payout.amount),
        currency: payout.currency,
        status: payout.status,
        txSignature: payout.txSignature,
        orderCount: payout.orderCount,
        createdAt: payout.createdAt.toISOString(),
        processedAt: payout.processedAt?.toISOString() || null,
      })),
      pendingPayouts: Array.from(pendingByStore.values()).map((p) => ({
        ...p,
        oldestOrderDate: p.oldestOrderDate.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Admin payouts error:', error);

    if (error instanceof Error && error.message === 'Admin access required') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch payouts' },
      { status: 500 }
    );
  }
}
