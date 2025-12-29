// app/api/admin/analytics/route.ts
// Admin analytics API

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

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
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d';

    // Calculate date ranges
    const now = new Date();
    let startDate: Date;
    let previousStartDate: Date;
    let previousEndDate: Date;

    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        previousStartDate = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        previousEndDate = startDate;
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        previousStartDate = new Date(startDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        previousEndDate = startDate;
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        previousStartDate = new Date(startDate.getTime() - 90 * 24 * 60 * 60 * 1000);
        previousEndDate = startDate;
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        previousStartDate = new Date(startDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        previousEndDate = startDate;
    }

    // Get current period stats
    const [
      totalRevenue,
      previousRevenue,
      totalOrders,
      previousOrders,
      totalUsers,
      newUsers,
      totalStores,
      activeStores,
      totalProducts,
      pendingProducts,
      pendingStores,
    ] = await Promise.all([
      // Revenue (current period)
      prisma.order.aggregate({
        _sum: { subtotal: true },
        where: {
          paymentStatus: 'COMPLETED',
          createdAt: { gte: startDate },
        },
      }),
      // Revenue (previous period)
      prisma.order.aggregate({
        _sum: { subtotal: true },
        where: {
          paymentStatus: 'COMPLETED',
          createdAt: { gte: previousStartDate, lt: previousEndDate },
        },
      }),
      // Orders (current period)
      prisma.order.count({
        where: {
          paymentStatus: 'COMPLETED',
          createdAt: { gte: startDate },
        },
      }),
      // Orders (previous period)
      prisma.order.count({
        where: {
          paymentStatus: 'COMPLETED',
          createdAt: { gte: previousStartDate, lt: previousEndDate },
        },
      }),
      // Total users
      prisma.user.count(),
      // New users (current period)
      prisma.user.count({
        where: { createdAt: { gte: startDate } },
      }),
      // Total stores
      prisma.store.count(),
      // Active stores
      prisma.store.count({
        where: { status: 'APPROVED' },
      }),
      // Total products
      prisma.product.count(),
      // Pending products
      prisma.product.count({
        where: { status: 'PENDING' },
      }),
      // Pending stores
      prisma.store.count({
        where: { status: 'PENDING' },
      }),
    ]);

    // Get platform fee earned
    const platformFees = await prisma.order.aggregate({
      _sum: { platformFee: true },
      where: {
        paymentStatus: 'COMPLETED',
        createdAt: { gte: startDate },
      },
    });

    // Get daily revenue for chart
    const dailyRevenueData = await prisma.$queryRaw`
      SELECT 
        DATE(created_at) as date,
        SUM(subtotal) as revenue,
        COUNT(*) as orders
      FROM orders
      WHERE payment_status = 'COMPLETED'
        AND created_at >= ${startDate}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    ` as { date: Date; revenue: number; orders: bigint }[];

    // Get top stores by revenue
    const topStores = await prisma.order.groupBy({
      by: ['storeId'],
      _sum: { subtotal: true },
      _count: { id: true },
      where: {
        paymentStatus: 'COMPLETED',
        createdAt: { gte: startDate },
      },
      orderBy: { _sum: { subtotal: 'desc' } },
      take: 5,
    });

    // Get store details for top stores
    const topStoreIds = topStores.map(s => s.storeId);
    const storeDetails = await prisma.store.findMany({
      where: { id: { in: topStoreIds } },
      select: { id: true, name: true, slug: true },
    });

    const topStoresWithDetails = topStores.map(s => {
      const store = storeDetails.find(sd => sd.id === s.storeId);
      return {
        id: s.storeId,
        name: store?.name || 'Unknown',
        slug: store?.slug || '',
        revenue: Number(s._sum.subtotal) || 0,
        orders: s._count.id,
      };
    });

    // Get top products by sales
    const topProducts = await prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true, price: true },
      _count: { id: true },
      where: {
        order: {
          paymentStatus: 'COMPLETED',
          createdAt: { gte: startDate },
        },
      },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    });

    const topProductIds = topProducts.map(p => p.productId);
    const productDetails = await prisma.product.findMany({
      where: { id: { in: topProductIds } },
      select: { id: true, name: true, images: true, store: { select: { name: true } } },
    });

    const topProductsWithDetails = topProducts.map(p => {
      const product = productDetails.find(pd => pd.id === p.productId);
      return {
        id: p.productId,
        name: product?.name || 'Unknown',
        image: product?.images[0] || null,
        storeName: product?.store.name || 'Unknown',
        unitsSold: Number(p._sum.quantity) || 0,
        revenue: Number(p._sum.price) || 0,
      };
    });

    // Calculate growth percentages
    const currentRevenue = Number(totalRevenue._sum.subtotal) || 0;
    const prevRevenue = Number(previousRevenue._sum.subtotal) || 0;
    const revenueGrowth = prevRevenue > 0 
      ? ((currentRevenue - prevRevenue) / prevRevenue * 100).toFixed(1)
      : '0';

    const orderGrowth = previousOrders > 0
      ? ((totalOrders - previousOrders) / previousOrders * 100).toFixed(1)
      : '0';

    // Get platform fee percent for display
    const platformFeePercent = await getPlatformFeePercent();

    return NextResponse.json({
      success: true,
      period,
      platformFeePercent,
      overview: {
        totalRevenue: currentRevenue,
        revenueGrowth: parseFloat(revenueGrowth),
        platformFees: Number(platformFees._sum.platformFee) || 0,
        totalOrders,
        orderGrowth: parseFloat(orderGrowth),
        totalUsers,
        newUsers,
        totalStores,
        activeStores,
        totalProducts,
        pendingProducts,
        pendingStores,
      },
      charts: {
        dailyRevenue: dailyRevenueData.map(d => ({
          date: d.date,
          revenue: Number(d.revenue) || 0,
          orders: Number(d.orders) || 0,
        })),
      },
      topStores: topStoresWithDetails,
      topProducts: topProductsWithDetails,
    });

  } catch (error) {
    console.error('Analytics error:', error);

    if (error instanceof Error && error.message === 'Admin access required') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
