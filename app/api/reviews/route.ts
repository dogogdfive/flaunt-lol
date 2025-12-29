// app/api/reviews/route.ts
// Product reviews API

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET reviews for a product
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!productId) {
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
    }

    const skip = (page - 1) * limit;

    const [reviews, total, stats] = await Promise.all([
      prisma.review.findMany({
        where: { productId },
        include: {
          user: {
            select: { name: true, avatarUrl: true, walletAddress: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.review.count({ where: { productId } }),
      prisma.review.groupBy({
        by: ['rating'],
        where: { productId },
        _count: { rating: true },
      }),
    ]);

    // Calculate rating distribution
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    stats.forEach((s) => {
      distribution[s.rating as keyof typeof distribution] = s._count.rating;
    });

    return NextResponse.json({
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        title: r.title,
        content: r.content,
        images: r.images,
        isVerified: r.isVerified,
        createdAt: r.createdAt,
        user: {
          name: r.user.name || `${r.user.walletAddress?.slice(0, 4)}...${r.user.walletAddress?.slice(-4)}`,
          avatar: r.user.avatarUrl,
        },
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      distribution,
    });
  } catch (error) {
    console.error('Reviews GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
}

// POST create a review
export async function POST(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet required' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { walletAddress },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { productId, orderId, rating, title, content, images } = body;

    if (!productId || !orderId || !rating) {
      return NextResponse.json({ error: 'Product ID, Order ID, and rating required' }, { status: 400 });
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be 1-5' }, { status: 400 });
    }

    // Verify the order belongs to this user and includes this product
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        customerId: user.id,
        status: { in: ['DELIVERED', 'CONFIRMED'] },
        items: {
          some: { productId },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'You can only review products from completed orders' }, { status: 403 });
    }

    // Check if already reviewed
    const existing = await prisma.review.findUnique({
      where: {
        userId_productId_orderId: {
          userId: user.id,
          productId,
          orderId,
        },
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'You have already reviewed this product for this order' }, { status: 400 });
    }

    // Create review
    const review = await prisma.review.create({
      data: {
        userId: user.id,
        productId,
        orderId,
        rating,
        title: title || null,
        content: content || null,
        images: images || [],
        isVerified: true,
      },
    });

    // Update product average rating
    const avgResult = await prisma.review.aggregate({
      where: { productId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await prisma.product.update({
      where: { id: productId },
      data: {
        avgRating: avgResult._avg.rating,
        reviewCount: avgResult._count.rating,
      },
    });

    // Notify merchant
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { store: { include: { owner: true } } },
    });

    if (product?.store.owner) {
      await prisma.notification.create({
        data: {
          userId: product.store.owner.id,
          type: 'REVIEW_RECEIVED',
          title: 'New Review',
          message: `${product.name} received a ${rating}-star review`,
          metadata: {
            productId,
            reviewId: review.id,
            rating,
          },
        },
      });
    }

    return NextResponse.json({ success: true, review });
  } catch (error) {
    console.error('Reviews POST error:', error);
    return NextResponse.json({ error: 'Failed to create review' }, { status: 500 });
  }
}
