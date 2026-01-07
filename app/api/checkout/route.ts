// app/api/checkout/route.ts
// Checkout and order creation API

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { createPaymentRequest } from '@/lib/solana-pay';
// NOTE: Emails and notifications are sent AFTER payment confirmation
// See app/api/orders/[id]/pay/route.ts

// Fetch platform fee from database
async function getPlatformFeePercent(): Promise<number> {
  const setting = await prisma.platformSettings.findUnique({
    where: { key: 'platform_fee_percent' },
  });
  if (setting?.value && typeof setting.value === 'object' && 'value' in setting.value) {
    return Number((setting.value as { value: number }).value) || 3.5;
  }
  return 3.5; // Default fallback
}

function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${timestamp}-${random}`;
}

// POST - Create order from cart
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    
    const {
      shippingAddress,
      email,
      currency = 'USDC',
      fulfillmentType = 'SHIPPING',
      pickupNotes,
    } = body;

    // Validate based on fulfillment type
    if (fulfillmentType === 'SHIPPING') {
      // Shipping requires full address
      if (!shippingAddress || !shippingAddress.name || !shippingAddress.line1 ||
          !shippingAddress.city || !shippingAddress.state ||
          !shippingAddress.postalCode || !shippingAddress.country) {
        return NextResponse.json(
          { error: 'Complete shipping address is required' },
          { status: 400 }
        );
      }
    }
    // For LOCAL_PICKUP, shipping address is optional

    // Email is optional - buyer is warned that orders are non-refundable
    // and they won't receive tracking without email

    // Get cart items
    const cartItems = await prisma.cartItem.findMany({
      where: { userId: user.id },
      include: {
        product: {
          include: {
            store: true,
          },
        },
        variant: true,
      },
    });

    if (cartItems.length === 0) {
      return NextResponse.json(
        { error: 'Cart is empty' },
        { status: 400 }
      );
    }

    // Cancel any existing PENDING orders for this user (from cancelled checkouts)
    await prisma.order.updateMany({
      where: {
        customerId: user.id,
        status: 'PENDING',
        paymentStatus: 'PENDING',
      },
      data: {
        status: 'CANCELLED',
      },
    });

    // Group items by store (each store gets its own order)
    const itemsByStore = new Map<string, typeof cartItems>();
    for (const item of cartItems) {
      const storeId = item.product.storeId;
      if (!itemsByStore.has(storeId)) {
        itemsByStore.set(storeId, []);
      }
      itemsByStore.get(storeId)!.push(item);
    }

    const orders = [];

    // Get dynamic platform fee from database
    const platformFeePercent = await getPlatformFeePercent();

    // Create an order for each store
    for (const [storeId, items] of itemsByStore) {
      const store = items[0].product.store;

      // Calculate totals
      let subtotal = 0;
      const orderItems = items.map(item => {
        const price = item.variant?.priceSol
          ? Number(item.variant.priceSol)
          : Number(item.product.priceSol);
        const itemTotal = price * item.quantity;
        subtotal += itemTotal;

        return {
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          price,
          currency: currency as 'SOL' | 'USDC',
          productName: item.product.name,
          productImage: item.product.images[0] || null,
          variantName: item.variant?.name || null,
        };
      });

      const platformFee = subtotal * (platformFeePercent / 100);
      const merchantAmount = subtotal - platformFee;
      const orderNumber = generateOrderNumber();

      // Create order
      const order = await prisma.order.create({
        data: {
          orderNumber,
          customerId: user.id,
          storeId,
          status: 'PENDING',
          paymentStatus: 'PENDING',
          paymentCurrency: currency,
          subtotal,
          platformFee,
          merchantAmount,
          fulfillmentType: fulfillmentType as 'SHIPPING' | 'LOCAL_PICKUP',
          pickupNotes: fulfillmentType === 'LOCAL_PICKUP' ? pickupNotes : null,
          shippingAddress: fulfillmentType === 'SHIPPING' ? {
            ...shippingAddress,
            email,
          } : null,
          customerEmail: email,
          items: {
            create: orderItems,
          },
        },
        include: {
          items: true,
          store: true,
        },
      });

      orders.push(order);
      // NOTE: Emails and notifications are sent AFTER payment is confirmed
      // in app/api/orders/[id]/pay/route.ts
    }

    // NOTE: Stock updates, bonding curve increments, and cart clearing happen AFTER payment is confirmed
    // See app/api/orders/[id]/pay/route.ts
    // DO NOT clear cart here - only clear after payment is confirmed

    // Generate payment request for the total
    const totalAmount = orders.reduce((sum, o) => sum + Number(o.subtotal), 0);

    // Try to create payment request, but don't fail checkout if it errors
    let paymentRequest = null;
    try {
      paymentRequest = await createPaymentRequest({
        orderId: orders[0].id,
        amount: totalAmount,
        currency: currency as 'SOL' | 'USDC',
        storeName: orders[0].store.name,
        orderNumber: orders[0].orderNumber,
      });
    } catch (paymentError) {
      console.error('Payment request creation failed:', paymentError);
      // Continue without payment request - order is still created
    }

    return NextResponse.json({
      success: true,
      orders: orders.map(o => ({
        id: o.id,
        orderNumber: o.orderNumber,
        subtotal: Number(o.subtotal),
        status: o.status,
      })),
      payment: paymentRequest,
      totalAmount,
      currency,
    });

  } catch (error) {
    console.error('Checkout error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Please connect your wallet to checkout' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Checkout failed' },
      { status: 500 }
    );
  }
}
