// app/api/auctions/[id]/stream/route.ts
// Server-Sent Events for real-time auction updates (price, viewer count)

import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { calculateCurrentPrice, calculateTemperature, getTimeRemaining } from '@/lib/auction-pricing';
import { addViewer, removeViewer, getViewerCount, generateViewerId } from '@/lib/auction-viewers';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  // Get wallet address from query or header for viewer identification
  const { searchParams } = new URL(request.url);
  const walletAddress = searchParams.get('wallet') || request.headers.get('x-wallet-address');

  // Generate unique viewer ID
  const viewerId = walletAddress || generateViewerId();

  // Verify auction exists
  const auction = await prisma.auction.findFirst({
    where: {
      OR: [{ id }, { slug: id }],
    },
  });

  if (!auction) {
    return new Response('Auction not found', { status: 404 });
  }

  const auctionId = auction.id;

  // Add viewer to tracking
  addViewer(auctionId, viewerId, walletAddress || undefined);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let isActive = true;

      const sendUpdate = async () => {
        if (!isActive) return;

        try {
          // Fetch fresh auction data
          const freshAuction = await prisma.auction.findUnique({
            where: { id: auctionId },
          });

          if (!freshAuction) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ error: 'Auction not found', ended: true })}\n\n`)
            );
            isActive = false;
            controller.close();
            return;
          }

          // Check if auction has ended
          if (['SOLD', 'CANCELLED', 'ENDED_UNSOLD'].includes(freshAuction.status)) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                status: freshAuction.status,
                ended: true,
                winnerId: freshAuction.winnerId,
                winningPriceSol: freshAuction.winningPriceSol ? Number(freshAuction.winningPriceSol) : null,
                viewerCount: getViewerCount(auctionId),
              })}\n\n`)
            );
            isActive = false;
            removeViewer(auctionId, viewerId);
            controller.close();
            return;
          }

          // Calculate real-time values
          const pricing = {
            startPriceSol: Number(freshAuction.startPriceSol),
            floorPriceSol: Number(freshAuction.floorPriceSol),
            decayType: freshAuction.decayType,
            decaySteps: freshAuction.decaySteps as any,
            durationMinutes: freshAuction.durationMinutes,
            startsAt: freshAuction.startsAt,
          };

          const currentPrice = calculateCurrentPrice(pricing);
          const temperature = calculateTemperature(pricing);
          const timeRemaining = getTimeRemaining(pricing);
          const viewerCount = getViewerCount(auctionId);

          // Check if auction should auto-end (time expired)
          if (timeRemaining.expired && freshAuction.status === 'LIVE') {
            // Update auction status to ended
            await prisma.auction.update({
              where: { id: auctionId },
              data: {
                status: 'ENDED_UNSOLD',
                mediaExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
              },
            });

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                status: 'ENDED_UNSOLD',
                ended: true,
                currentPriceSol: currentPrice,
                temperature,
                timeRemaining,
                viewerCount,
              })}\n\n`)
            );
            isActive = false;
            removeViewer(auctionId, viewerId);
            controller.close();
            return;
          }

          // Check if scheduled auction should go live
          if (freshAuction.status === 'SCHEDULED') {
            const now = new Date();
            if (now >= freshAuction.startsAt) {
              await prisma.auction.update({
                where: { id: auctionId },
                data: { status: 'LIVE' },
              });
            }
          }

          const data = {
            status: freshAuction.status,
            currentPriceSol: currentPrice,
            temperature,
            timeRemaining,
            viewerCount,
            quantityRemaining: freshAuction.quantity - freshAuction.quantitySold,
            startsAt: freshAuction.startsAt,
            endsAt: freshAuction.endsAt,
          };

          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch (error) {
          console.error('Stream update error:', error);
        }
      };

      // Send initial update immediately
      await sendUpdate();

      // Send updates every second for live price tracking
      const interval = setInterval(sendUpdate, 1000);

      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeat = setInterval(() => {
        if (isActive) {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        }
      }, 30000);

      // Cleanup on disconnect
      request.signal.addEventListener('abort', () => {
        isActive = false;
        clearInterval(interval);
        clearInterval(heartbeat);
        removeViewer(auctionId, viewerId);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
