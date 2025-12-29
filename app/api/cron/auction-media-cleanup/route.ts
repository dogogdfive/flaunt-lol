// app/api/cron/auction-media-cleanup/route.ts
// Daily cron job to delete expired auction media
// Media is kept for 30 days after auction ends, then deleted

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max for cleanup

// Verify cron secret for security
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // If no secret is set, allow in development
  if (!cronSecret) {
    return process.env.NODE_ENV === 'development';
  }

  return authHeader === `Bearer ${cronSecret}`;
}

// Delete image from R2 storage
async function deleteFromR2(url: string): Promise<boolean> {
  try {
    // Extract key from URL
    const urlObj = new URL(url);
    const key = urlObj.pathname.replace(/^\//, '');

    if (!key) return false;

    const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
    const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
    const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
    const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
      console.log('[Media Cleanup] R2 not configured, skipping deletion');
      return false;
    }

    // Use S3-compatible API to delete
    const { S3Client, DeleteObjectCommand } = await import('@aws-sdk/client-s3');

    const s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });

    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
      })
    );

    return true;
  } catch (error) {
    console.error('[Media Cleanup] Failed to delete from R2:', error);
    return false;
  }
}

export async function GET(request: NextRequest) {
  // Verify authorization
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  console.log('[Auction Media Cleanup] Starting cleanup job...');

  try {
    // Find auctions with expired media
    const expiredAuctions = await prisma.auction.findMany({
      where: {
        mediaExpiresAt: {
          lt: new Date(),
        },
        OR: [
          { images: { isEmpty: false } },
          { videoUrl: { not: null } },
        ],
      },
      select: {
        id: true,
        title: true,
        images: true,
        videoUrl: true,
        mediaExpiresAt: true,
      },
      take: 100, // Process up to 100 auctions per run
    });

    console.log(`[Auction Media Cleanup] Found ${expiredAuctions.length} auctions with expired media`);

    if (expiredAuctions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No expired media to clean up',
        auctionsProcessed: 0,
        mediaFilesDeleted: 0,
        duration: Date.now() - startTime,
      });
    }

    let totalDeleted = 0;
    let totalFailed = 0;
    const processedAuctions: string[] = [];

    for (const auction of expiredAuctions) {
      console.log(`[Auction Media Cleanup] Processing auction: ${auction.title} (${auction.id})`);

      let auctionDeleted = 0;
      let auctionFailed = 0;

      // Delete images
      for (const imageUrl of auction.images) {
        const success = await deleteFromR2(imageUrl);
        if (success) {
          auctionDeleted++;
        } else {
          auctionFailed++;
        }
      }

      // Delete video
      if (auction.videoUrl) {
        const success = await deleteFromR2(auction.videoUrl);
        if (success) {
          auctionDeleted++;
        } else {
          auctionFailed++;
        }
      }

      // Clear media URLs from record (auction history remains)
      await prisma.auction.update({
        where: { id: auction.id },
        data: {
          images: [],
          videoUrl: null,
          // Don't clear mediaExpiresAt - keeps record that cleanup was done
        },
      });

      totalDeleted += auctionDeleted;
      totalFailed += auctionFailed;
      processedAuctions.push(auction.id);

      console.log(`[Auction Media Cleanup] Auction ${auction.id}: ${auctionDeleted} deleted, ${auctionFailed} failed`);
    }

    const duration = Date.now() - startTime;

    console.log(`[Auction Media Cleanup] Completed in ${duration}ms`);
    console.log(`[Auction Media Cleanup] Total: ${totalDeleted} files deleted, ${totalFailed} failed`);

    return NextResponse.json({
      success: true,
      message: 'Media cleanup completed',
      auctionsProcessed: processedAuctions.length,
      mediaFilesDeleted: totalDeleted,
      mediaFilesFailed: totalFailed,
      processedAuctionIds: processedAuctions,
      duration,
    });

  } catch (error) {
    console.error('[Auction Media Cleanup] Error:', error);
    return NextResponse.json(
      {
        error: 'Cleanup failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}
