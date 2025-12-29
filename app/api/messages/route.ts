// app/api/messages/route.ts
// Messaging API for platform communication

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { sendNewMessageNotification } from '@/lib/email';

// Force dynamic rendering for auth headers
export const dynamic = 'force-dynamic';

// GET messages for current user
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    const conversationWith = searchParams.get('with'); // userId to get conversation with

    // Build query
    const where: any = {
      OR: [
        { senderId: user.id },
        { receiverId: user.id },
      ],
    };

    if (storeId) {
      where.storeId = storeId;
    }

    if (conversationWith) {
      where.OR = [
        { senderId: user.id, receiverId: conversationWith },
        { senderId: conversationWith, receiverId: user.id },
      ];
    }

    const messages = await prisma.message.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        sender: {
          select: {
            id: true,
            walletAddress: true,
            name: true,
            username: true,
            avatarUrl: true,
            role: true,
          },
        },
        receiver: {
          select: {
            id: true,
            walletAddress: true,
            name: true,
            username: true,
            avatarUrl: true,
            role: true,
          },
        },
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    // Get conversation list (unique users the current user has messaged with) with last message time
    const conversations = await prisma.$queryRaw`
      SELECT
        CASE
          WHEN sender_id = ${user.id} THEN receiver_id
          ELSE sender_id
        END as other_user_id,
        MAX(created_at) as last_message_at
      FROM messages
      WHERE sender_id = ${user.id} OR receiver_id = ${user.id}
      GROUP BY other_user_id
      ORDER BY last_message_at DESC
    ` as { other_user_id: string; last_message_at: Date }[];

    // Get user details for conversations
    const otherUserIds = conversations.map(c => c.other_user_id);
    const conversationUsers = otherUserIds.length > 0 ? await prisma.user.findMany({
      where: { id: { in: otherUserIds } },
      select: {
        id: true,
        walletAddress: true,
        name: true,
        username: true,
        avatarUrl: true,
        role: true,
        stores: {
          select: { id: true, name: true, slug: true },
          take: 1,
        },
      },
    }) : [];

    // Get unread count for each conversation
    const unreadCounts = await prisma.message.groupBy({
      by: ['senderId'],
      where: {
        receiverId: user.id,
        readAt: null,
      },
      _count: { id: true },
    });

    // Build conversations with counts and last message time, maintaining order
    const conversationsWithCounts = conversations.map(conv => {
      const user = conversationUsers.find(u => u.id === conv.other_user_id);
      if (!user) return null;
      return {
        ...user,
        unreadCount: unreadCounts.find(c => c.senderId === user.id)?._count.id || 0,
        lastMessageAt: conv.last_message_at,
      };
    }).filter(Boolean);

    return NextResponse.json({
      success: true,
      messages,
      conversations: conversationsWithCounts,
    });

  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

// POST send a message
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { receiverId, storeId, subject, content } = body;

    if (!receiverId || !content) {
      return NextResponse.json(
        { error: 'Receiver and content are required' },
        { status: 400 }
      );
    }

    // Verify receiver exists
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
    });

    if (!receiver) {
      return NextResponse.json(
        { error: 'Recipient not found' },
        { status: 404 }
      );
    }

    // Check if this is valid communication
    const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
    const isReceiverAdmin = receiver.role === 'ADMIN' || receiver.role === 'SUPER_ADMIN';
    const isMerchant = user.role === 'MERCHANT';
    const isReceiverMerchant = receiver.role === 'MERCHANT';
    const isCustomer = user.role === 'CUSTOMER';
    const isReceiverCustomer = receiver.role === 'CUSTOMER';

    // Check if receiver is a store owner (has a store)
    const receiverStore = await prisma.store.findFirst({
      where: { ownerId: receiver.id },
    });
    const isReceiverStoreOwner = !!receiverStore;

    // Allow: admin<->anyone, merchant<->customer (for order support), customer<->admin (for support)
    const validCommunication =
      isAdmin || // Admins can message anyone
      isReceiverAdmin || // Anyone can message admins
      (isMerchant && isReceiverCustomer) ||
      (isCustomer && isReceiverMerchant);

    if (!validCommunication) {
      return NextResponse.json(
        { error: 'Invalid message recipient' },
        { status: 403 }
      );
    }

    // Get sender's store info if merchant
    let senderStore = null;
    if (isMerchant) {
      senderStore = await prisma.store.findFirst({
        where: { ownerId: user.id },
        select: { name: true },
      });
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        senderId: user.id,
        receiverId,
        storeId: storeId || null,
        subject: subject || null,
        content,
      },
      include: {
        sender: {
          select: {
            id: true,
            walletAddress: true,
            name: true,
            role: true,
          },
        },
        receiver: {
          select: {
            id: true,
            walletAddress: true,
            name: true,
            role: true,
            email: true,
          },
        },
      },
    });

    // Send email notification to receiver if they have an email
    if (receiver.email) {
      const dashboardUrl = isReceiverMerchant
        ? `${process.env.NEXT_PUBLIC_APP_URL}/merchant/messages`
        : isReceiverAdmin
        ? `${process.env.NEXT_PUBLIC_APP_URL}/admin/messages`
        : `${process.env.NEXT_PUBLIC_APP_URL}/account/messages`;

      sendNewMessageNotification(receiver.email, {
        senderName: user.name || user.walletAddress?.slice(0, 8) || 'User',
        senderRole: user.role as 'ADMIN' | 'MERCHANT' | 'CUSTOMER',
        storeName: senderStore?.name,
        messagePreview: content,
        recipientName: receiver.name || undefined,
        dashboardUrl,
      }).catch(err => console.error('Failed to send message notification email:', err));
    }

    return NextResponse.json({
      success: true,
      message,
    });

  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}

// PATCH mark messages as read
export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { messageIds, conversationWith } = body;

    if (conversationWith) {
      // Mark all messages from a specific user as read
      await prisma.message.updateMany({
        where: {
          senderId: conversationWith,
          receiverId: user.id,
          readAt: null,
        },
        data: {
          readAt: new Date(),
        },
      });
    } else if (messageIds && Array.isArray(messageIds)) {
      // Mark specific messages as read
      await prisma.message.updateMany({
        where: {
          id: { in: messageIds },
          receiverId: user.id,
          readAt: null,
        },
        data: {
          readAt: new Date(),
        },
      });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error marking messages as read:', error);
    return NextResponse.json(
      { error: 'Failed to update messages' },
      { status: 500 }
    );
  }
}
