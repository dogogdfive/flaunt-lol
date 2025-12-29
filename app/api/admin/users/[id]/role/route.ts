// app/api/admin/users/[id]/role/route.ts
// API endpoint for changing user roles (Super Admin only)

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/auth';

// Change user role
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify requester is super admin
    const admin = await requireSuperAdmin();

    const { role } = await request.json();
    const userId = params.id;

    // Validate role
    const validRoles = ['CUSTOMER', 'MERCHANT', 'ADMIN', 'SUPER_ADMIN'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    // Get target user
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Can't change your own role
    if (targetUser.id === admin.id) {
      return NextResponse.json(
        { error: 'Cannot change your own role' },
        { status: 400 }
      );
    }

    // Super admins can change any role (including other super admins)

    // Update role
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        email: true,
        walletAddress: true,
        name: true,
        role: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });

  } catch (error) {
    console.error('Error changing user role:', error);
    
    if (error instanceof Error && error.message === 'Super Admin access required') {
      return NextResponse.json(
        { error: 'Super Admin access required' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
