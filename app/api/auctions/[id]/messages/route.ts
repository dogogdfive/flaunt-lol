// app/api/auctions/[id]/messages/route.ts
// Auction live chat messages

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET: Get chat messages for an auction
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const before = searchParams.get('before'); // For pagination

    const auction = await prisma.auction.findFirst({
      where: {
        OR: [{ id: params.id }, { slug: params.id }],
      },
    });

    if (!auction) {
      return NextResponse.json(
        { error: 'Auction not found' },
        { status: 404 }
      );
    }

    const where: any = { auctionId: auction.id };
    if (before) {
      where.createdAt = { lt: new Date(before) };
    }

    const messages = await prisma.auctionMessage.findMany({
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
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Return in chronological order
    const sortedMessages = messages.reverse();

    return NextResponse.json({
      success: true,
      messages: sortedMessages,
      hasMore: messages.length === limit,
    });
  } catch (error) {
    console.error('Error fetching auction messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

// POST: Send a chat message (logged-in users only)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Must be logged in to chat' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { walletAddress },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user is banned
    if (user.isBanned) {
      return NextResponse.json(
        { error: 'Your account is suspended' },
        { status: 403 }
      );
    }

    const auction = await prisma.auction.findFirst({
      where: {
        OR: [{ id: params.id }, { slug: params.id }],
      },
    });

    if (!auction) {
      return NextResponse.json(
        { error: 'Auction not found' },
        { status: 404 }
      );
    }

    // Only allow chat on live auctions
    if (auction.status !== 'LIVE') {
      return NextResponse.json(
        { error: 'Chat is only available for live auctions' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { content } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message cannot be empty' },
        { status: 400 }
      );
    }

    // Limit message length
    if (content.length > 500) {
      return NextResponse.json(
        { error: 'Message too long (max 500 characters)' },
        { status: 400 }
      );
    }

    // Simple rate limiting: check last message time
    const lastMessage = await prisma.auctionMessage.findFirst({
      where: {
        userId: user.id,
        auctionId: auction.id,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (lastMessage) {
      const timeSinceLastMessage = Date.now() - lastMessage.createdAt.getTime();
      if (timeSinceLastMessage < 1000) {
        // 1 second cooldown
        return NextResponse.json(
          { error: 'Please wait before sending another message' },
          { status: 429 }
        );
      }
    }

    const message = await prisma.auctionMessage.create({
      data: {
        auctionId: auction.id,
        userId: user.id,
        content: content.trim(),
      },
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
    });

    return NextResponse.json({
      success: true,
      message,
    });
  } catch (error) {
    console.error('Error sending auction message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
