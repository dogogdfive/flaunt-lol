// app/api/admin/users/route.ts
// Admin endpoint to get all users

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Build where clause
    const where: any = {};

    if (role && role !== 'all') {
      where.role = role;
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { walletAddress: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get users
    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        email: true,
        walletAddress: true,
        name: true,
        username: true,
        role: true,
        isVerified: true,
        isBanned: true,
        bannedReason: true,
        createdAt: true,
        stores: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            stores: true,
            orders: true,
          },
        },
      },
    });

    // Get total count
    const total = await prisma.user.count({ where });

    // Get role counts
    const roleCounts = await prisma.user.groupBy({
      by: ['role'],
      _count: { role: true },
    });

    return NextResponse.json({
      success: true,
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        total,
        byRole: roleCounts.reduce((acc, r) => {
          acc[r.role] = r._count.role;
          return acc;
        }, {} as Record<string, number>),
      },
    });

  } catch (error) {
    console.error('Error fetching users:', error);

    if (error instanceof Error && error.message === 'Admin access required') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
