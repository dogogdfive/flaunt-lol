// app/api/account/profile/route.ts
// API endpoint for user profile management

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - Fetch user profile
export async function GET(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address required' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { walletAddress },
      select: {
        id: true,
        walletAddress: true,
        name: true,
        username: true,
        email: true,
        avatarUrl: true,
        createdAt: true,
        _count: {
          select: {
            orders: true,
            stores: true,
            reviews: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

// PATCH - Update user profile
export async function PATCH(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, username, email, avatarUrl } = body;

    // Find the user
    const user = await prisma.user.findUnique({
      where: { walletAddress },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Validate username if provided
    if (username !== undefined) {
      // Username validation rules
      if (username && username.length > 0) {
        // Check length
        if (username.length < 3 || username.length > 20) {
          return NextResponse.json(
            { error: 'Username must be between 3 and 20 characters' },
            { status: 400 }
          );
        }

        // Check format (alphanumeric and underscores only)
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
          return NextResponse.json(
            { error: 'Username can only contain letters, numbers, and underscores' },
            { status: 400 }
          );
        }

        // Check if username is already taken by another user
        const existingUser = await prisma.user.findUnique({
          where: { username },
        });

        if (existingUser && existingUser.id !== user.id) {
          return NextResponse.json(
            { error: 'Username is already taken' },
            { status: 400 }
          );
        }
      }
    }

    // Validate email if provided
    if (email !== undefined && email && email.length > 0) {
      // Basic email validation
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        );
      }

      // Check if email is already taken by another user
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser && existingUser.id !== user.id) {
        return NextResponse.json(
          { error: 'Email is already in use' },
          { status: 400 }
        );
      }
    }

    // Update the user
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: name !== undefined ? (name || null) : undefined,
        username: username !== undefined ? (username || null) : undefined,
        email: email !== undefined ? (email || null) : undefined,
        avatarUrl: avatarUrl !== undefined ? (avatarUrl || null) : undefined,
      },
      select: {
        id: true,
        walletAddress: true,
        name: true,
        username: true,
        email: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}

// POST - Check username availability
export async function POST(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    const body = await request.json();
    const { username } = body;

    if (!username) {
      return NextResponse.json({ available: false, error: 'Username required' });
    }

    // Validate format
    if (username.length < 3 || username.length > 20) {
      return NextResponse.json({ available: false, error: 'Username must be 3-20 characters' });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json({ available: false, error: 'Only letters, numbers, underscores allowed' });
    }

    // Check if taken
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    // If the username belongs to the current user, it's available for them
    if (existingUser && walletAddress) {
      const currentUser = await prisma.user.findUnique({
        where: { walletAddress },
      });
      if (currentUser && existingUser.id === currentUser.id) {
        return NextResponse.json({ available: true });
      }
    }

    return NextResponse.json({
      available: !existingUser,
      error: existingUser ? 'Username is already taken' : undefined,
    });
  } catch (error) {
    console.error('Error checking username:', error);
    return NextResponse.json({ available: false, error: 'Check failed' });
  }
}
