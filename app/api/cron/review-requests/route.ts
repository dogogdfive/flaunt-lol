// app/api/cron/review-requests/route.ts
// Cron job to send review request emails after delivery
// Call this endpoint daily via Vercel Cron

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendReviewRequest } from '@/lib/email';

export const dynamic = 'force-dynamic';

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
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('[Review Request Cron] Starting...');

    // Find orders that:
    // 1. Were delivered 3-7 days ago
    // 2. Don't have reviews yet
    // 3. Customer has email
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

    const deliveredOrders = await prisma.order.findMany({
      where: {
        status: { in: ['DELIVERED', 'CONFIRMED'] },
        deliveredAt: {
          gte: sevenDaysAgo,
          lte: threeDaysAgo,
        },
        customerEmail: { not: null },
      },
      include: {
        customer: {
          select: { name: true },
        },
        store: {
          select: { name: true },
        },
        items: {
          include: {
            product: {
              select: { name: true, images: true, slug: true },
            },
          },
        },
        reviews: true,
      },
      take: 50, // Limit to avoid sending too many at once
    });

    // Filter out orders that already have reviews
    const ordersWithoutReviews = deliveredOrders.filter(order => order.reviews.length === 0);

    console.log(`[Review Request Cron] Found ${ordersWithoutReviews.length} orders for review requests`);

    let emailsSent = 0;

    for (const order of ordersWithoutReviews) {
      if (!order.customerEmail) continue;

      await sendReviewRequest(order.customerEmail, {
        customerName: order.customer.name || 'there',
        orderNumber: order.orderNumber,
        products: order.items.map((item) => ({
          name: item.product.name,
          image: item.product.images[0],
          slug: item.product.slug,
        })),
        storeName: order.store.name,
      });

      emailsSent++;
    }

    console.log(`[Review Request Cron] Sent ${emailsSent} review request emails`);

    return NextResponse.json({
      success: true,
      ordersProcessed: ordersWithoutReviews.length,
      emailsSent,
    });
  } catch (error) {
    console.error('[Review Request Cron] Error:', error);
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 });
  }
}
