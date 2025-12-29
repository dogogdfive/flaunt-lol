// app/api/products/[id]/route.ts
// Get single product by ID - for live bonding curve updates

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: params.id },
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

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    // Only return if approved (or let frontend handle)
    return NextResponse.json({
      success: true,
      product: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        priceSol: Number(product.priceSol),
        priceUsdc: product.priceUsdc ? Number(product.priceUsdc) : null,
        images: product.images,
        category: product.category,
        quantity: product.quantity,
        totalSold: product.totalSold,
        bondingEnabled: product.bondingEnabled,
        bondingGoal: product.bondingGoal,
        bondingCurrent: product.bondingCurrent,  // ← This updates live!
        store: product.store,
      },
    });

  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}
