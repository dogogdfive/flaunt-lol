// app/api/admin/stats/route.ts
// Admin dashboard stats API

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    // Get all stats in parallel
    const [
      activeStoresCount,
      totalOrdersCount,
      totalRevenue,
      totalUsersCount,
    ] = await Promise.all([
      // Active stores (APPROVED status)
      prisma.store.count({
        where: { status: 'APPROVED' },
      }),

      // Total orders (completed payments)
      prisma.order.count({
        where: { paymentStatus: 'COMPLETED' },
      }),

      // Total revenue (sum of all completed order subtotals)
      prisma.order.aggregate({
        where: { paymentStatus: 'COMPLETED' },
        _sum: { subtotal: true },
      }),

      // Total users
      prisma.user.count(),
    ]);

    return NextResponse.json({
      success: true,
      stats: {
        activeStores: activeStoresCount,
        totalOrders: totalOrdersCount,
        totalRevenue: totalRevenue._sum.subtotal ? Number(totalRevenue._sum.subtotal) : 0,
        totalUsers: totalUsersCount,
      },
    });

  } catch (error) {
    console.error('Admin stats error:', error);

    if (error instanceof Error && error.message === 'Admin access required') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
