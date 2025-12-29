// app/api/merchant/products/bulk-update/route.ts
// Bulk update product prices

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PATCH(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address required' },
        { status: 401 }
      );
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { walletAddress },
      include: {
        stores: {
          select: { id: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const storeIds = user.stores.map(s => s.id);

    if (storeIds.length === 0) {
      return NextResponse.json(
        { error: 'No store found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { updates } = body;

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json(
        { error: 'Updates array required' },
        { status: 400 }
      );
    }

    // Validate all products belong to user's stores
    const productIds = updates.map((u: any) => u.productId);
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        storeId: { in: storeIds },
      },
      select: { id: true },
    });

    const validProductIds = new Set(products.map(p => p.id));

    // Update each product
    const results = await Promise.all(
      updates.map(async (update: { productId: string; priceSol: number; priceUsdc: number }) => {
        if (!validProductIds.has(update.productId)) {
          return { productId: update.productId, success: false, error: 'Product not found or not owned' };
        }

        try {
          await prisma.product.update({
            where: { id: update.productId },
            data: {
              priceSol: update.priceSol,
              priceUsdc: update.priceUsdc,
            },
          });
          return { productId: update.productId, success: true };
        } catch (err) {
          return { productId: update.productId, success: false, error: 'Update failed' };
        }
      })
    );

    const successCount = results.filter(r => r.success).length;

    return NextResponse.json({
      success: true,
      message: `Updated ${successCount} of ${updates.length} products`,
      results,
    });
  } catch (error) {
    console.error('Bulk update error:', error);
    return NextResponse.json(
      { error: 'Failed to update products' },
      { status: 500 }
    );
  }
}
