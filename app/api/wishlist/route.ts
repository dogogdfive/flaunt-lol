// app/api/wishlist/route.ts
// Wishlist management API

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// GET - Get user's wishlist
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const wishlistItems = await prisma.wishlistItem.findMany({
      where: { userId: user.id },
      include: {
        product: {
          include: {
            store: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const items = wishlistItems.map(item => ({
      id: item.id,
      productId: item.productId,
      createdAt: item.createdAt,
      product: {
        id: item.product.id,
        name: item.product.name,
        slug: item.product.slug,
        priceSol: Number(item.product.priceSol),
        images: item.product.images,
        quantity: item.product.quantity,
        status: item.product.status,
        store: item.product.store,
      },
    }));

    return NextResponse.json({
      success: true,
      items,
      count: items.length,
    });

  } catch (error) {
    console.error('Wishlist fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wishlist' },
      { status: 500 }
    );
  }
}

// POST - Add item to wishlist
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { productId } = body;

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    // Check product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || product.status !== 'APPROVED') {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Check if already in wishlist
    const existing = await prisma.wishlistItem.findFirst({
      where: { userId: user.id, productId },
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        message: 'Already in wishlist',
        item: existing,
      });
    }

    // Add to wishlist
    const wishlistItem = await prisma.wishlistItem.create({
      data: {
        userId: user.id,
        productId,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Added to wishlist',
      item: wishlistItem,
    });

  } catch (error) {
    console.error('Add to wishlist error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Please connect your wallet to save items' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to add to wishlist' },
      { status: 500 }
    );
  }
}

// DELETE - Remove from wishlist
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    await prisma.wishlistItem.deleteMany({
      where: { userId: user.id, productId },
    });

    return NextResponse.json({
      success: true,
      message: 'Removed from wishlist',
    });

  } catch (error) {
    console.error('Remove from wishlist error:', error);
    return NextResponse.json(
      { error: 'Failed to remove from wishlist' },
      { status: 500 }
    );
  }
}
