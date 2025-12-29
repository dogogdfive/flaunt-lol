// app/api/admin/notifications/route.ts
// Admin notifications API

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAdmin();

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: any = {
      userId: user.id,
    };

    if (unreadOnly) {
      where.readAt = null;
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const unreadCount = await prisma.notification.count({
      where: {
        userId: user.id,
        readAt: null,
      },
    });

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount,
    });

  } catch (error) {
    console.error('Error fetching admin notifications:', error);

    if (error instanceof Error && error.message === 'Admin access required') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAdmin();
    const body = await request.json();
    const { notificationIds, markAll } = body;

    if (markAll) {
      await prisma.notification.updateMany({
        where: {
          userId: user.id,
          readAt: null,
        },
        data: {
          readAt: new Date(),
        },
      });
    } else if (notificationIds?.length) {
      await prisma.notification.updateMany({
        where: {
          id: { in: notificationIds },
          userId: user.id,
        },
        data: {
          readAt: new Date(),
        },
      });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error marking admin notifications read:', error);
    return NextResponse.json(
      { error: 'Failed to update notifications' },
      { status: 500 }
    );
  }
}
