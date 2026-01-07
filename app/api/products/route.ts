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
    const categorySlug = searchParams.get('categorySlug');
    const sort = searchParams.get('sort') || 'newest';
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');
    const search = searchParams.get('search');

    // Local/pickup filters
    const pickupOnly = searchParams.get('pickupOnly') === 'true';
    const city = searchParams.get('city');
    const state = searchParams.get('state');

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

    // Filter by category slug
    if (categorySlug) {
      where.category = { slug: categorySlug };
    }

    // Filter for local pickup products only
    if (pickupOnly) {
      where.allowsLocalPickup = true;
    }

    // Filter by store location (city/state)
    if (city) {
      where.store = {
        ...where.store,
        showLocation: true,
        businessCity: { equals: city, mode: 'insensitive' },
      };
    }
    if (state) {
      where.store = {
        ...where.store,
        showLocation: true,
        businessState: { equals: state, mode: 'insensitive' },
      };
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

    // Get products with reviews
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
            showLocation: true,
            businessCity: true,
            businessState: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        reviews: {
          select: {
            id: true,
            rating: true,
            content: true,
            createdAt: true,
            user: {
              select: {
                name: true,
                username: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 3, // Get latest 3 reviews per product
        },
      },
    });

    // Get total count
    const total = await prisma.product.count({ where });

    return NextResponse.json({
      success: true,
      products: products.map((p) => {
        // Calculate average rating
        const reviewCount = p.reviews.length;
        const avgRating = reviewCount > 0
          ? p.reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
          : null;

        return {
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
          allowsShipping: p.allowsShipping,
          allowsLocalPickup: p.allowsLocalPickup,
          store: {
            id: p.store.id,
            name: p.store.name,
            slug: p.store.slug,
            logoUrl: p.store.logoUrl,
            isVerified: p.store.isVerified,
            // Only expose location if store opted in
            ...(p.store.showLocation && {
              city: p.store.businessCity,
              state: p.store.businessState,
            }),
          },
          // Review data
          avgRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
          reviewCount,
          reviews: p.reviews.map(r => ({
            id: r.id,
            rating: r.rating,
            content: r.content,
            userName: r.user.username || r.user.name || 'Anonymous',
            createdAt: r.createdAt.toISOString(),
          })),
        };
      }),
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
