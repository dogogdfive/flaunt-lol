// app/api/users/route.ts
// API for fetching users (limited to specific uses like support)

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET users (filtered by role, for support purposes)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Only allow fetching admins (for support messaging)
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Only admin lookup is allowed' },
        { status: 403 }
      );
    }

    const users = await prisma.user.findMany({
      where: {
        role: {
          in: ['ADMIN', 'SUPER_ADMIN'],
        },
      },
      select: {
        id: true,
        name: true,
        role: true,
      },
      take: Math.min(limit, 10),
    });

    return NextResponse.json({
      success: true,
      users,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
