// app/api/auth/check-admin/route.ts
// Check if a wallet address has admin privileges

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');

    if (!walletAddress) {
      return NextResponse.json({
        success: true,
        isAdmin: false,
        role: null,
      });
    }

    const user = await prisma.user.findUnique({
      where: { walletAddress },
      select: {
        id: true,
        role: true,
        isBanned: true,
      },
    });

    if (!user || user.isBanned) {
      return NextResponse.json({
        success: true,
        isAdmin: false,
        role: null,
      });
    }

    const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';

    return NextResponse.json({
      success: true,
      isAdmin,
      role: user.role,
    });
  } catch (error) {
    console.error('Error checking admin status:', error);
    return NextResponse.json(
      { error: 'Failed to check admin status' },
      { status: 500 }
    );
  }
}
