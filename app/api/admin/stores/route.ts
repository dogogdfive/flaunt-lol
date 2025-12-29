// app/api/admin/stores/route.ts
// Admin stores listing API

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    console.log('[Admin Stores] Fetching stores...');
    const admin = await requireAdmin();
    console.log('[Admin Stores] Admin verified:', admin.id, admin.walletAddress);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    console.log('[Admin Stores] Query params:', { status, page, limit });

    const where: any = {};
    if (status) where.status = status;

    const [stores, total] = await Promise.all([
      prisma.store.findMany({
        where,
        include: {
          owner: {
            select: { id: true, email: true, walletAddress: true, name: true },
          },
          _count: {
            select: { products: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.store.count({ where }),
    ]);

    console.log('[Admin Stores] Found', stores.length, 'stores, total:', total);

    const formatted = stores.map(s => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      description: s.description,
      logoUrl: s.logoUrl,
      bannerUrl: s.bannerUrl,
      status: s.status,
      totalOrders: s.totalOrders,
      totalSales: Number(s.totalSales),
      createdAt: s.createdAt,
      owner: s.owner,
      _count: s._count,
    }));

    return NextResponse.json({
      success: true,
      stores: formatted,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error('Admin stores error:', error);

    if (error instanceof Error && error.message === 'Admin access required') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch stores' },
      { status: 500 }
    );
  }
}
