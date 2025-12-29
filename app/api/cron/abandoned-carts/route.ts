// app/api/cron/abandoned-carts/route.ts
// Cron job to send abandoned cart emails
// Call this endpoint daily via Vercel Cron or external cron service

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendAbandonedCartReminder } from '@/lib/email';

export const dynamic = 'force-dynamic';

// Verify cron secret to prevent unauthorized access
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.warn('CRON_SECRET not configured');
    return false;
  }

  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  // Verify authorization
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('[Abandoned Cart Cron] Starting...');

    // Find carts that:
    // 1. Have items
    // 2. Were updated 24-48 hours ago (give time but not too stale)
    // 3. User has email
    // 4. User hasn't placed an order in the last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

    const abandonedCarts = await prisma.cartItem.groupBy({
      by: ['userId'],
      where: {
        updatedAt: {
          gte: fortyEightHoursAgo,
          lte: twentyFourHoursAgo,
        },
      },
    });

    console.log(`[Abandoned Cart Cron] Found ${abandonedCarts.length} potential abandoned carts`);

    let emailsSent = 0;

    for (const cart of abandonedCarts) {
      // Get user details
      const user = await prisma.user.findUnique({
        where: { id: cart.userId },
        select: { id: true, email: true, name: true, walletAddress: true },
      });

      if (!user?.email) continue;

      // Check if user placed an order recently (skip if they did)
      const recentOrder = await prisma.order.findFirst({
        where: {
          customerId: user.id,
          createdAt: { gte: twentyFourHoursAgo },
        },
      });

      if (recentOrder) continue;

      // Get cart items
      const cartItems = await prisma.cartItem.findMany({
        where: { userId: user.id },
        include: {
          product: {
            select: { name: true, images: true, priceSol: true },
          },
        },
      });

      if (cartItems.length === 0) continue;

      // Calculate total
      const total = cartItems.reduce(
        (sum, item) => sum + Number(item.product.priceSol) * item.quantity,
        0
      );

      // Send email
      await sendAbandonedCartReminder(user.email, {
        customerName: user.name || 'there',
        items: cartItems.map((item) => ({
          name: item.product.name,
          image: item.product.images[0],
          price: Number(item.product.priceSol).toFixed(2),
          quantity: item.quantity,
        })),
        totalValue: total.toFixed(2),
        currency: 'SOL',
      });

      emailsSent++;
    }

    console.log(`[Abandoned Cart Cron] Sent ${emailsSent} reminder emails`);

    return NextResponse.json({
      success: true,
      cartsProcessed: abandonedCarts.length,
      emailsSent,
    });
  } catch (error) {
    console.error('[Abandoned Cart Cron] Error:', error);
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 });
  }
}
