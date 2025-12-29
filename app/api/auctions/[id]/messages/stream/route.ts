// app/api/auctions/[id]/messages/stream/route.ts
// Server-Sent Events for real-time chat messages

import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

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
  let lastMessageId: string | null = null;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let isActive = true;

      // Get initial last message ID
      const lastMsg = await prisma.auctionMessage.findFirst({
        where: { auctionId },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });
      lastMessageId = lastMsg?.id || null;

      const checkNewMessages = async () => {
        if (!isActive) return;

        try {
          // Check if auction is still active
          const currentAuction = await prisma.auction.findUnique({
            where: { id: auctionId },
            select: { status: true },
          });

          if (!currentAuction || !['LIVE', 'SCHEDULED'].includes(currentAuction.status)) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'auction_ended', status: currentAuction?.status })}\n\n`)
            );
            isActive = false;
            controller.close();
            return;
          }

          // Fetch new messages since last check
          const where: any = { auctionId };
          if (lastMessageId) {
            // Get the timestamp of last message
            const lastMsgData = await prisma.auctionMessage.findUnique({
              where: { id: lastMessageId },
              select: { createdAt: true },
            });
            if (lastMsgData) {
              where.createdAt = { gt: lastMsgData.createdAt };
            }
          }

          const newMessages = await prisma.auctionMessage.findMany({
            where,
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  username: true,
                  avatarUrl: true,
                  walletAddress: true,
                  isVerified: true,
                },
              },
            },
            orderBy: { createdAt: 'asc' },
            take: 20, // Limit batch size
          });

          if (newMessages.length > 0) {
            // Update last message ID
            lastMessageId = newMessages[newMessages.length - 1].id;

            // Send each new message
            for (const message of newMessages) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'message', message })}\n\n`)
              );
            }
          }
        } catch (error) {
          console.error('Chat stream error:', error);
        }
      };

      // Check for new messages every 500ms for fast chat
      const interval = setInterval(checkNewMessages, 500);

      // Send heartbeat every 30 seconds
      const heartbeat = setInterval(() => {
        if (isActive) {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        }
      }, 30000);

      // Send initial connection success
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'connected', auctionId })}\n\n`)
      );

      // Cleanup on disconnect
      request.signal.addEventListener('abort', () => {
        isActive = false;
        clearInterval(interval);
        clearInterval(heartbeat);
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
