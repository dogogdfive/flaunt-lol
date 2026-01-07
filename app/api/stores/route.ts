// app/api/stores/route.ts
// Public API to fetch approved stores

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const featured = searchParams.get('featured') === 'true';
    const city = searchParams.get('city');
    const state = searchParams.get('state');
    const localOnly = searchParams.get('localOnly') === 'true';

    const where: any = {
      status: 'APPROVED',
    };

    // Filter stores that have location enabled
    if (localOnly) {
      where.showLocation = true;
    }

    // Filter by city (only stores with showLocation enabled)
    if (city) {
      where.showLocation = true;
      where.businessCity = { equals: city, mode: 'insensitive' };
    }

    // Filter by state (only stores with showLocation enabled)
    if (state) {
      where.showLocation = true;
      where.businessState = { equals: state, mode: 'insensitive' };
    }

    // Get approved stores with their banners
    const stores = await prisma.store.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        logoUrl: true,
        bannerUrl: true,
        isVerified: true,
        totalSales: true,
        totalOrders: true,
        createdAt: true,
        showLocation: true,
        businessCity: true,
        businessState: true,
        _count: {
          select: {
            products: true,
          },
        },
      },
      orderBy: featured ? { totalSales: 'desc' } : { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      stores: stores.map(store => ({
        id: store.id,
        name: store.name,
        slug: store.slug,
        description: store.description,
        logoUrl: store.logoUrl,
        bannerUrl: store.bannerUrl,
        isVerified: store.isVerified,
        totalSales: Number(store.totalSales),
        totalOrders: store.totalOrders,
        productCount: store._count.products,
        createdAt: store.createdAt,
        // Only expose location if store opted in
        ...(store.showLocation && {
          city: store.businessCity,
          state: store.businessState,
        }),
      })),
    });

  } catch (error) {
    console.error('Error fetching stores:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch stores', details: errorMessage },
      { status: 500 }
    );
  }
}
