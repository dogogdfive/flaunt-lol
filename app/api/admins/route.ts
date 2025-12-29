// app/api/admins/route.ts
// API to fetch admin users for messaging

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address required' },
        { status: 401 }
      );
    }

    // Fetch all admin users (excluding the current user if they're an admin)
    const admins = await prisma.user.findMany({
      where: {
        role: 'ADMIN',
        walletAddress: {
          not: walletAddress, // Don't show current user
        },
        isBanned: false,
      },
      select: {
        id: true,
        walletAddress: true,
        name: true,
        username: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return NextResponse.json({
      success: true,
      admins,
    });
  } catch (error) {
    console.error('Error fetching admins:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admins' },
      { status: 500 }
    );
  }
}
