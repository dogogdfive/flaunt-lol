// app/api/products/route.ts
// Get products - public endpoint for storefront

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Query parameters
    const storeSlug = searchParams.get('store');
    const category = searchParams.get('category');
    const sort = searchParams.get('sort') || 'newest';
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');
    const search = searchParams.get('search');

    // Build where clause - ONLY APPROVED PRODUCTS
    const where: any = {
      status: 'APPROVED', // Only show approved products!
      store: {
        status: 'APPROVED', // From approved stores only!
      },
    };

    if (storeSlug) {
      where.store = { ...where.store, slug: storeSlug };
    }

    if (category) {
      where.category = category;
    }

    // Search by name or description
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Build order clause
    let orderBy: any = { createdAt: 'desc' };
    switch (sort) {
      case 'newest':
        orderBy = { createdAt: 'desc' };
        break;
      case 'popular':
        // Sort by actual confirmed sales (totalSold field updated on payment confirmation)
        orderBy = { totalSold: 'desc' };
        break;
      case 'oldest':
        orderBy = { createdAt: 'asc' };
        break;
      case 'price_low':
        orderBy = { priceSol: 'asc' };
        break;
      case 'price_high':
        orderBy = { priceSol: 'desc' };
        break;
    }

    // Get products
    const products = await prisma.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            isVerified: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    // Get total count
    const total = await prisma.product.count({ where });

    return NextResponse.json({
      success: true,
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        priceSol: Number(p.priceSol),
        priceUsdc: p.priceUsdc ? Number(p.priceUsdc) : null,
        images: p.images,
        category: p.category,
        quantity: p.quantity,
        totalSold: 0, // Will show 0 until we have confirmed payouts
        confirmedSales: 0,
        bondingEnabled: p.bondingEnabled,
        bondingGoal: p.bondingGoal,
        bondingCurrent: p.bondingCurrent,
        store: p.store,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error('Error fetching products:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch products', details: errorMessage },
      { status: 500 }
    );
  }
}
