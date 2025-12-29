// app/api/cron/low-stock-alerts/route.ts
// Cron job to send low stock alerts to merchants
// Call this endpoint daily via Vercel Cron

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendLowStockAlert } from '@/lib/email';

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
    console.log('[Low Stock Cron] Starting...');

    // Find products that are low stock or out of stock
    const lowStockProducts = await prisma.product.findMany({
      where: {
        status: 'APPROVED',
        OR: [
          { quantity: 0 },
          {
            quantity: {
              lte: prisma.product.fields.lowStockAlert,
            },
          },
        ],
      },
      include: {
        store: {
          include: {
            owner: {
              select: { email: true },
            },
          },
        },
      },
    });

    console.log(`[Low Stock Cron] Found ${lowStockProducts.length} low stock products`);

    let alertsSent = 0;

    for (const product of lowStockProducts) {
      const merchantEmail = product.store.owner.email;
      if (!merchantEmail) continue;

      // Check if we already sent an alert for this product recently (within 7 days)
      const recentNotification = await prisma.notification.findFirst({
        where: {
          userId: product.store.ownerId,
          type: product.quantity === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK',
          metadata: {
            path: ['productId'],
            equals: product.id,
          },
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      });

      if (recentNotification) continue;

      // Send email
      await sendLowStockAlert(merchantEmail, {
        productName: product.name,
        currentStock: product.quantity,
        productId: product.id,
        storeName: product.store.name,
      });

      // Create notification to track that we sent this
      await prisma.notification.create({
        data: {
          userId: product.store.ownerId,
          type: product.quantity === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK',
          title: product.quantity === 0 ? 'Product Sold Out' : 'Low Stock Alert',
          message: `${product.name} ${product.quantity === 0 ? 'is now sold out' : `has only ${product.quantity} items left`}`,
          metadata: {
            productId: product.id,
            quantity: product.quantity,
          },
        },
      });

      alertsSent++;
    }

    console.log(`[Low Stock Cron] Sent ${alertsSent} alerts`);

    return NextResponse.json({
      success: true,
      productsChecked: lowStockProducts.length,
      alertsSent,
    });
  } catch (error) {
    console.error('[Low Stock Cron] Error:', error);
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 });
  }
}
