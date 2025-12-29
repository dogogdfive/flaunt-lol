// app/api/merchant/dashboard/route.ts
// Merchant dashboard stats API

import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for auth headers
export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import { requireMerchant } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await requireMerchant();

    // Get merchant's stores
    const stores = await prisma.store.findMany({
      where: { ownerId: user.id },
      select: { id: true, name: true, totalSales: true, totalOrders: true },
    });

    if (stores.length === 0) {
      return NextResponse.json({
        success: true,
        stats: {
          totalRevenue: 0,
          totalOrders: 0,
          productsSold: 0,
          pendingPayout: 0,
        },
        recentOrders: [],
        topProducts: [],
      });
    }

    const storeIds = stores.map((s) => s.id);

    // Get time periods
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get total revenue and orders
    const totalRevenue = stores.reduce((sum, s) => sum + Number(s.totalSales), 0);
    const totalOrders = stores.reduce((sum, s) => sum + s.totalOrders, 0);

    // Get products sold
    const productsSold = await prisma.orderItem.aggregate({
      where: {
        order: {
          storeId: { in: storeIds },
          paymentStatus: 'COMPLETED',
        },
      },
      _sum: {
        quantity: true,
      },
    });

    // Get orders from this week
    const weekOrders = await prisma.order.count({
      where: {
        storeId: { in: storeIds },
        createdAt: { gte: weekAgo },
      },
    });

    // Get pending payout (orders that are PAID but not yet paid out)
    const pendingPayoutOrders = await prisma.order.aggregate({
      where: {
        storeId: { in: storeIds },
        paymentStatus: 'COMPLETED',
        payoutId: null,
      },
      _sum: {
        merchantAmount: true,
      },
    });

    // Get recent orders
    const recentOrders = await prisma.order.findMany({
      where: { storeId: { in: storeIds } },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        customer: {
          select: { walletAddress: true, name: true },
        },
        items: {
          take: 1,
          include: {
            product: {
              select: { name: true },
            },
          },
        },
      },
    });

    // Get top products
    const topProducts = await prisma.product.findMany({
      where: { storeId: { in: storeIds } },
      orderBy: { totalSold: 'desc' },
      take: 4,
      select: {
        id: true,
        name: true,
        images: true,
        totalSold: true,
        priceSol: true,
      },
    });

    // Get pending orders count
    const pendingOrdersCount = await prisma.order.count({
      where: {
        storeId: { in: storeIds },
        status: { in: ['PENDING', 'PAID', 'PROCESSING'] },
      },
    });

    return NextResponse.json({
      success: true,
      stats: {
        totalRevenue: totalRevenue,
        totalOrders: totalOrders,
        productsSold: productsSold._sum.quantity || 0,
        pendingPayout: Number(pendingPayoutOrders._sum.merchantAmount) || 0,
        weekOrders: weekOrders,
        pendingOrdersCount: pendingOrdersCount,
      },
      recentOrders: recentOrders.map((order) => ({
        id: order.orderNumber,
        customer: order.customer?.walletAddress
          ? `${order.customer.walletAddress.slice(0, 4)}...${order.customer.walletAddress.slice(-4)}`
          : order.customer?.name || 'Unknown',
        product: order.items[0]?.product?.name || 'Multiple items',
        amount: `${Number(order.subtotal)} SOL`,
        status: order.status,
        time: getTimeAgo(order.createdAt),
      })),
      topProducts: topProducts.map((product) => ({
        id: product.id,
        name: product.name,
        image: product.images[0] || null,
        sold: product.totalSold,
        revenue: `${(product.totalSold * Number(product.priceSol)).toFixed(2)} SOL`,
      })),
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  return `${days} day${days > 1 ? 's' : ''} ago`;
}
