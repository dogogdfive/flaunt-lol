// app/api/admin/stores/route.ts
// Admin stores listing and creation API

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin, requireSuperAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    console.log('[Admin Stores] Fetching stores...');
    const admin = await requireAdmin();
    console.log('[Admin Stores] Admin verified:', admin.id, admin.walletAddress);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    console.log('[Admin Stores] Query params:', { status, page, limit });

    const where: any = {};
    if (status) where.status = status;

    const [stores, total] = await Promise.all([
      prisma.store.findMany({
        where,
        include: {
          owner: {
            select: { id: true, email: true, walletAddress: true, name: true },
          },
          _count: {
            select: { products: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.store.count({ where }),
    ]);

    console.log('[Admin Stores] Found', stores.length, 'stores, total:', total);

    const formatted = stores.map(s => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      description: s.description,
      logoUrl: s.logoUrl,
      bannerUrl: s.bannerUrl,
      status: s.status,
      totalOrders: s.totalOrders,
      totalSales: Number(s.totalSales),
      createdAt: s.createdAt,
      owner: s.owner,
      _count: s._count,
    }));

    return NextResponse.json({
      success: true,
      stores: formatted,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error('Admin stores error:', error);

    if (error instanceof Error && error.message === 'Admin access required') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch stores', details: (error as any)?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST - Create a store directly (Super Admin only)
export async function POST(request: NextRequest) {
  try {
    const admin = await requireSuperAdmin();
    console.log('[Admin Stores] Creating store, admin:', admin.walletAddress);

    const body = await request.json();
    const { walletAddress, storeName, description, status = 'APPROVED' } = body;

    if (!walletAddress || !storeName) {
      return NextResponse.json(
        { error: 'walletAddress and storeName are required' },
        { status: 400 }
      );
    }

    // Find or create user by wallet address
    let user = await prisma.user.findFirst({
      where: { walletAddress },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          walletAddress,
          role: 'MERCHANT',
        },
      });
      console.log('[Admin Stores] Created new user:', user.id);
    } else {
      // Ensure user has at least MERCHANT role
      if (user.role === 'CUSTOMER') {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: 'MERCHANT' },
        });
      }
    }

    // Generate slug from store name
    const baseSlug = storeName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    let slug = baseSlug;
    let counter = 1;
    while (await prisma.store.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Create the store
    const store = await prisma.store.create({
      data: {
        ownerId: user.id,
        name: storeName,
        slug,
        description: description || `${storeName} store`,
        status: status as 'PENDING' | 'APPROVED' | 'REJECTED',
        payoutWallet: walletAddress,
      },
    });

    console.log('[Admin Stores] Store created:', store.id, store.slug);

    return NextResponse.json({
      success: true,
      store: {
        id: store.id,
        name: store.name,
        slug: store.slug,
        status: store.status,
        ownerId: store.ownerId,
      },
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        role: user.role,
      },
    });

  } catch (error) {
    console.error('Admin create store error:', error);

    if (error instanceof Error && error.message === 'Super Admin access required') {
      return NextResponse.json(
        { error: 'Super Admin access required' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create store' },
      { status: 500 }
    );
  }
}
