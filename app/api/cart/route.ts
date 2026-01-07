// app/api/cart/route.ts
// Cart management API

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// GET - Get user's cart
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const cartItems = await prisma.cartItem.findMany({
      where: { userId: user.id },
      include: {
        product: {
          include: {
            store: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
        variant: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate totals
    let totalSol = 0;
    let totalUsdc = 0;
    const items = cartItems.map(item => {
      const priceSol = item.variant?.priceSol
        ? Number(item.variant.priceSol)
        : Number(item.product.priceSol);
      // Use stored USDC price, or calculate from SOL at $200 rate
      const priceUsdc = item.product.priceUsdc
        ? Number(item.product.priceUsdc)
        : priceSol * 200;
      const itemTotalSol = priceSol * item.quantity;
      const itemTotalUsdc = priceUsdc * item.quantity;
      totalSol += itemTotalSol;
      totalUsdc += itemTotalUsdc;

      return {
        id: item.id,
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        product: {
          id: item.product.id,
          name: item.product.name,
          slug: item.product.slug,
          priceSol: Number(item.product.priceSol),
          priceUsdc: item.product.priceUsdc ? Number(item.product.priceUsdc) : null,
          images: item.product.images,
          quantity: item.product.quantity, // Stock available
          allowsShipping: item.product.allowsShipping,
          allowsLocalPickup: item.product.allowsLocalPickup,
          store: item.product.store,
        },
        variant: item.variant ? {
          id: item.variant.id,
          name: item.variant.name,
          priceSol: item.variant.priceSol ? Number(item.variant.priceSol) : null,
          quantity: item.variant.quantity,
        } : null,
        itemTotal: itemTotalSol,
        itemTotalUsdc: itemTotalUsdc,
      };
    });

    return NextResponse.json({
      success: true,
      items,
      totalSol,
      totalUsdc,
      itemCount: items.reduce((acc, item) => acc + item.quantity, 0),
    });

  } catch (error) {
    console.error('Cart fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cart' },
      { status: 500 }
    );
  }
}

// POST - Add item to cart
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { productId, variantId, quantity = 1 } = body;

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    // Check product exists and is available
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { variants: true },
    });

    if (!product || product.status !== 'APPROVED') {
      return NextResponse.json(
        { error: 'Product not found or unavailable' },
        { status: 404 }
      );
    }

    // Check stock
    const availableStock = variantId 
      ? product.variants.find(v => v.id === variantId)?.quantity || 0
      : product.quantity;

    if (availableStock < quantity) {
      return NextResponse.json(
        { error: availableStock === 0 ? 'Product is sold out' : `Only ${availableStock} items available` },
        { status: 400 }
      );
    }

    // Check if already in cart
    const existingItem = await prisma.cartItem.findFirst({
      where: {
        userId: user.id,
        productId,
        variantId: variantId || null,
      },
    });

    if (existingItem) {
      // Update quantity
      const newQuantity = existingItem.quantity + quantity;
      
      if (newQuantity > availableStock) {
        return NextResponse.json(
          { error: `Only ${availableStock} items available` },
          { status: 400 }
        );
      }

      const updated = await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
      });

      return NextResponse.json({
        success: true,
        message: 'Cart updated',
        item: updated,
      });
    }

    // Add new item
    const cartItem = await prisma.cartItem.create({
      data: {
        userId: user.id,
        productId,
        variantId: variantId || null,
        quantity,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Added to cart',
      item: cartItem,
    });

  } catch (error) {
    console.error('Add to cart error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Please connect your wallet to add items to cart' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to add to cart' },
      { status: 500 }
    );
  }
}

// PATCH - Update cart item quantity
export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { cartItemId, quantity } = body;

    if (!cartItemId || quantity === undefined) {
      return NextResponse.json(
        { error: 'Cart item ID and quantity are required' },
        { status: 400 }
      );
    }

    const cartItem = await prisma.cartItem.findFirst({
      where: { id: cartItemId, userId: user.id },
      include: { product: true, variant: true },
    });

    if (!cartItem) {
      return NextResponse.json(
        { error: 'Cart item not found' },
        { status: 404 }
      );
    }

    // If quantity is 0, delete the item
    if (quantity <= 0) {
      await prisma.cartItem.delete({ where: { id: cartItemId } });
      return NextResponse.json({
        success: true,
        message: 'Item removed from cart',
      });
    }

    // Check stock
    const availableStock = cartItem.variant?.quantity ?? cartItem.product.quantity;
    if (quantity > availableStock) {
      return NextResponse.json(
        { error: `Only ${availableStock} items available` },
        { status: 400 }
      );
    }

    const updated = await prisma.cartItem.update({
      where: { id: cartItemId },
      data: { quantity },
    });

    return NextResponse.json({
      success: true,
      item: updated,
    });

  } catch (error) {
    console.error('Update cart error:', error);
    return NextResponse.json(
      { error: 'Failed to update cart' },
      { status: 500 }
    );
  }
}

// DELETE - Remove item or clear cart
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const cartItemId = searchParams.get('id');
    const clearAll = searchParams.get('clear') === 'true';

    if (clearAll) {
      await prisma.cartItem.deleteMany({
        where: { userId: user.id },
      });

      return NextResponse.json({
        success: true,
        message: 'Cart cleared',
      });
    }

    if (!cartItemId) {
      return NextResponse.json(
        { error: 'Cart item ID is required' },
        { status: 400 }
      );
    }

    await prisma.cartItem.deleteMany({
      where: { id: cartItemId, userId: user.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Item removed from cart',
    });

  } catch (error) {
    console.error('Delete cart error:', error);
    return NextResponse.json(
      { error: 'Failed to remove from cart' },
      { status: 500 }
    );
  }
}
