// app/api/admin/products/route.ts
// Admin products listing API

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const storeId = searchParams.get('storeId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: any = {};
    if (status) where.status = status;
    if (storeId) where.storeId = storeId;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          store: {
            select: { id: true, name: true, slug: true },
          },
          category: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    const formatted = products.map(p => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      priceSol: Number(p.priceSol),
      priceUsdc: p.priceUsdc ? Number(p.priceUsdc) : null,
      images: p.images,
      status: p.status,
      quantity: p.quantity,
      totalSold: p.totalSold,
      createdAt: p.createdAt,
      store: p.store,
      category: p.category,
    }));

    return NextResponse.json({
      success: true,
      products: formatted,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error('Admin products error:', error);

    if (error instanceof Error && error.message === 'Admin access required') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}
