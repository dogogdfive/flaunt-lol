// app/api/stores/[slug]/reviews/route.ts
// Store reviews API - GET reviews, POST new review

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// GET store reviews
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const sort = searchParams.get('sort') || 'newest'; // newest, oldest, highest, lowest

    // Find store by slug
    const store = await prisma.store.findUnique({
      where: { slug: params.slug },
      select: { id: true, avgRating: true, reviewCount: true },
    });

    if (!store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }

    // Build sort order
    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'oldest') orderBy = { createdAt: 'asc' };
    if (sort === 'highest') orderBy = { rating: 'desc' };
    if (sort === 'lowest') orderBy = { rating: 'asc' };

    // Get reviews
    const [reviews, total] = await Promise.all([
      prisma.storeReview.findMany({
        where: { storeId: store.id },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              walletAddress: true,
            },
          },
        },
      }),
      prisma.storeReview.count({ where: { storeId: store.id } }),
    ]);

    // Get rating distribution
    const ratingDistribution = await prisma.storeReview.groupBy({
      by: ['rating'],
      where: { storeId: store.id },
      _count: { rating: true },
    });

    const distribution = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };
    ratingDistribution.forEach((r) => {
      distribution[r.rating as keyof typeof distribution] = r._count.rating;
    });

    return NextResponse.json({
      success: true,
      reviews,
      avgRating: store.avgRating,
      reviewCount: store.reviewCount,
      distribution,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching store reviews:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}

// POST new store review
export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address required' },
        { status: 401 }
      );
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { walletAddress },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Find store
    const store = await prisma.store.findUnique({
      where: { slug: params.slug },
    });

    if (!store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }

    // Can't review your own store
    if (store.ownerId === user.id) {
      return NextResponse.json(
        { error: 'You cannot review your own store' },
        { status: 400 }
      );
    }

    // Check if user already reviewed this store
    const existingReview = await prisma.storeReview.findUnique({
      where: {
        userId_storeId: {
          userId: user.id,
          storeId: store.id,
        },
      },
    });

    if (existingReview) {
      return NextResponse.json(
        { error: 'You have already reviewed this store' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { rating, title, content, images } = body;

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Check if user has purchased from this store (for verified badge)
    const hasPurchased = await prisma.order.findFirst({
      where: {
        customerId: user.id,
        storeId: store.id,
        paymentStatus: 'COMPLETED',
      },
    });

    // Create review
    const review = await prisma.storeReview.create({
      data: {
        userId: user.id,
        storeId: store.id,
        rating,
        title: title || null,
        content: content || null,
        images: images || [],
        isVerified: !!hasPurchased,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            walletAddress: true,
          },
        },
      },
    });

    // Update store average rating
    const stats = await prisma.storeReview.aggregate({
      where: { storeId: store.id },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await prisma.store.update({
      where: { id: store.id },
      data: {
        avgRating: stats._avg.rating,
        reviewCount: stats._count.rating,
      },
    });

    // Notify store owner
    await prisma.notification.create({
      data: {
        userId: store.ownerId,
        type: 'REVIEW_RECEIVED',
        title: 'New Store Review',
        message: `${user.name || user.username || 'Someone'} left a ${rating}-star review for your store`,
        metadata: {
          reviewId: review.id,
          rating,
          storeSlug: store.slug,
        },
      },
    });

    return NextResponse.json({
      success: true,
      review,
    });
  } catch (error) {
    console.error('Error creating store review:', error);
    return NextResponse.json(
      { error: 'Failed to create review' },
      { status: 500 }
    );
  }
}

// PATCH update a review (user can update their own review)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address required' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { walletAddress },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const store = await prisma.store.findUnique({
      where: { slug: params.slug },
    });

    if (!store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { reviewId, rating, title, content } = body;

    // Find the review
    const review = await prisma.storeReview.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }

    // Check if user owns this review
    if (review.userId !== user.id) {
      return NextResponse.json(
        { error: 'You can only edit your own reviews' },
        { status: 403 }
      );
    }

    if (rating && (rating < 1 || rating > 5)) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Update the review
    const updatedReview = await prisma.storeReview.update({
      where: { id: reviewId },
      data: {
        rating: rating || review.rating,
        title: title !== undefined ? title : review.title,
        content: content !== undefined ? content : review.content,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            walletAddress: true,
          },
        },
      },
    });

    // Update store average rating
    const stats = await prisma.storeReview.aggregate({
      where: { storeId: store.id },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await prisma.store.update({
      where: { id: store.id },
      data: {
        avgRating: stats._avg.rating,
        reviewCount: stats._count.rating,
      },
    });

    return NextResponse.json({
      success: true,
      review: updatedReview,
    });
  } catch (error) {
    console.error('Error updating store review:', error);
    return NextResponse.json(
      { error: 'Failed to update review' },
      { status: 500 }
    );
  }
}

// DELETE a review (user can delete their own, admins can delete any)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address required' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { walletAddress },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const store = await prisma.store.findUnique({
      where: { slug: params.slug },
    });

    if (!store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const reviewId = searchParams.get('reviewId');

    if (!reviewId) {
      return NextResponse.json(
        { error: 'Review ID required' },
        { status: 400 }
      );
    }

    const review = await prisma.storeReview.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }

    // Check if user owns the review OR is an admin
    const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
    const isOwner = review.userId === user.id;

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'You can only delete your own reviews' },
        { status: 403 }
      );
    }

    // Delete the review
    await prisma.storeReview.delete({
      where: { id: reviewId },
    });

    // Update store average rating
    const stats = await prisma.storeReview.aggregate({
      where: { storeId: store.id },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await prisma.store.update({
      where: { id: store.id },
      data: {
        avgRating: stats._avg.rating || null,
        reviewCount: stats._count.rating,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Review deleted',
    });
  } catch (error) {
    console.error('Error deleting store review:', error);
    return NextResponse.json(
      { error: 'Failed to delete review' },
      { status: 500 }
    );
  }
}
