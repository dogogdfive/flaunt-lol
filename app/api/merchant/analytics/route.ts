// app/api/merchant/analytics/route.ts
// Merchant analytics and stats

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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

    // Get date ranges
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Get all paid orders
    const orders = await prisma.order.findMany({
      where: {
        storeId: store.id,
        paymentStatus: 'COMPLETED',
      },
      select: {
        id: true,
        merchantAmount: true,
        paymentCurrency: true,
        createdAt: true,
        status: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Calculate revenue by day for the last 30 days
    const revenueByDay: Record<string, number> = {};
    const last30DaysOrders = orders.filter(o => o.createdAt >= thirtyDaysAgo);

    // Initialize all days to 0
    for (let i = 0; i < 30; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = date.toISOString().split('T')[0];
      revenueByDay[key] = 0;
    }

    // Fill in actual revenue
    for (const order of last30DaysOrders) {
      const key = order.createdAt.toISOString().split('T')[0];
      if (revenueByDay[key] !== undefined) {
        revenueByDay[key] += Number(order.merchantAmount);
      }
    }

    // Convert to array sorted by date
    const revenueChart = Object.entries(revenueByDay)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, amount]) => ({
        date,
        amount: Math.round(amount * 10000) / 10000,
      }));

    // Calculate totals
    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.merchantAmount), 0);
    const last30DaysRevenue = last30DaysOrders.reduce((sum, o) => sum + Number(o.merchantAmount), 0);
    const last7DaysRevenue = orders
      .filter(o => o.createdAt >= sevenDaysAgo)
      .reduce((sum, o) => sum + Number(o.merchantAmount), 0);

    // Previous 30 days for comparison
    const previous30DaysOrders = orders.filter(
      o => o.createdAt >= sixtyDaysAgo && o.createdAt < thirtyDaysAgo
    );
    const previous30DaysRevenue = previous30DaysOrders.reduce((sum, o) => sum + Number(o.merchantAmount), 0);

    // Growth percentage
    const revenueGrowth = previous30DaysRevenue > 0
      ? ((last30DaysRevenue - previous30DaysRevenue) / previous30DaysRevenue) * 100
      : last30DaysRevenue > 0 ? 100 : 0;

    // Get top selling products
    const productSales = await prisma.orderItem.groupBy({
      by: ['productId', 'productName'],
      where: {
        order: {
          storeId: store.id,
          paymentStatus: 'COMPLETED',
        },
      },
      _sum: {
        quantity: true,
        price: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: 5,
    });

    const topProducts = productSales.map(p => ({
      name: p.productName,
      sold: p._sum.quantity || 0,
      revenue: Number(p._sum.price || 0),
    }));

    // Order status breakdown
    const statusCounts = await prisma.order.groupBy({
      by: ['status'],
      where: {
        storeId: store.id,
        paymentStatus: 'COMPLETED',
      },
      _count: true,
    });

    const ordersByStatus = statusCounts.reduce((acc, s) => {
      acc[s.status] = s._count;
      return acc;
    }, {} as Record<string, number>);

    // Get products with low stock
    const lowStockProducts = await prisma.product.findMany({
      where: {
        storeId: store.id,
        status: 'APPROVED',
        quantity: { lte: prisma.product.fields.lowStockAlert },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        quantity: true,
        lowStockAlert: true,
        images: true,
      },
      orderBy: { quantity: 'asc' },
      take: 10,
    });

    // Manual filter for low stock (Prisma doesn't support comparing columns directly)
    const lowStockFiltered = await prisma.product.findMany({
      where: {
        storeId: store.id,
        status: 'APPROVED',
      },
      select: {
        id: true,
        name: true,
        slug: true,
        quantity: true,
        lowStockAlert: true,
        images: true,
      },
    });

    const actualLowStock = lowStockFiltered
      .filter(p => p.quantity <= p.lowStockAlert)
      .sort((a, b) => a.quantity - b.quantity)
      .slice(0, 10);

    return NextResponse.json({
      success: true,
      analytics: {
        totalRevenue: Math.round(totalRevenue * 10000) / 10000,
        last30DaysRevenue: Math.round(last30DaysRevenue * 10000) / 10000,
        last7DaysRevenue: Math.round(last7DaysRevenue * 10000) / 10000,
        revenueGrowth: Math.round(revenueGrowth * 10) / 10,
        totalOrders: orders.length,
        last30DaysOrders: last30DaysOrders.length,
        ordersByStatus,
        revenueChart,
        topProducts,
        lowStockProducts: actualLowStock.map(p => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          quantity: p.quantity,
          threshold: p.lowStockAlert,
          image: p.images?.[0] || null,
        })),
        currency: orders[0]?.paymentCurrency || 'SOL',
      },
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
