// app/api/payments/create/route.ts
// Create a new payment request using Solana Pay

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createPaymentRequest } from '@/lib/solana-pay';
import { requireAuth } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const { items, currency, shippingAddress, customerEmail } = body;

    // Validate input
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'No items provided' },
        { status: 400 }
      );
    }

    if (!currency || !['SOL', 'USDC'].includes(currency)) {
      return NextResponse.json(
        { error: 'Invalid currency' },
        { status: 400 }
      );
    }

    // Calculate totals and validate products
    let subtotal = 0;
    const orderItems = [];
    let storeId: string | null = null;

    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: { store: true },
      });

      if (!product) {
        return NextResponse.json(
          { error: `Product ${item.productId} not found` },
          { status: 404 }
        );
      }

      if (product.status !== 'APPROVED') {
        return NextResponse.json(
          { error: `Product ${product.name} is not available` },
          { status: 400 }
        );
      }

      if (product.quantity < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for ${product.name}` },
          { status: 400 }
        );
      }

      // All items must be from the same store
      if (storeId && storeId !== product.storeId) {
        return NextResponse.json(
          { error: 'All items must be from the same store' },
          { status: 400 }
        );
      }
      storeId = product.storeId;

      const price = currency === 'SOL' 
        ? Number(product.priceSol) 
        : Number(product.priceUsdc || product.priceSol);

      subtotal += price * item.quantity;

      orderItems.push({
        productId: product.id,
        variantId: item.variantId || null,
        quantity: item.quantity,
        price: price,
        currency: currency,
        productName: product.name,
        productImage: (product.images as string[])[0] || null,
        variantName: null, // TODO: Get variant name if variantId provided
      });
    }

    // Get platform fee
    const platformFeeSetting = await prisma.platformSettings.findUnique({
      where: { key: 'platform_fee_percent' },
    });
    const platformFeePercent = (platformFeeSetting?.value as any)?.value || 3.5;
    const platformFee = subtotal * (platformFeePercent / 100);
    const merchantAmount = subtotal - platformFee;

    // Generate order number
    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;

    // Create order
    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerId: user.id,
        storeId: storeId!,
        status: 'PENDING',
        paymentStatus: 'PENDING',
        paymentCurrency: currency,
        subtotal,
        platformFee,
        merchantAmount,
        shippingAddress: shippingAddress || null,
        customerEmail: customerEmail || user.email,
        items: {
          create: orderItems,
        },
      },
      include: {
        store: true,
        items: true,
      },
    });

    // Create Solana Pay payment request
    const paymentRequest = await createPaymentRequest({
      orderId: order.id,
      amount: subtotal,
      currency: currency as 'SOL' | 'USDC',
      storeName: order.store.name,
      orderNumber: order.orderNumber,
    });

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        subtotal,
        currency,
      },
      payment: paymentRequest,
    });

  } catch (error) {
    console.error('Error creating payment:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Please connect your wallet to continue' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    );
  }
}
