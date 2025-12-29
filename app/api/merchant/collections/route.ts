// app/api/merchant/collections/route.ts
// Merchant collections management API

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// GET - Get merchant's collections
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Get merchant's store
    const store = await prisma.store.findFirst({
      where: { ownerId: user.id },
    });

    if (!store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }

    const collections = await prisma.collection.findMany({
      where: { storeId: store.id },
      include: {
        products: {
          include: {
            product: {
              select: { id: true, name: true, images: true, status: true },
            },
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    const formatted = collections.map(c => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      imageUrl: c.imageUrl,
      isActive: c.isActive,
      sortOrder: c.sortOrder,
      productCount: c.products.length,
      products: c.products.map(pc => ({
        id: pc.product.id,
        name: pc.product.name,
        image: pc.product.images[0],
        status: pc.product.status,
      })),
      createdAt: c.createdAt,
    }));

    return NextResponse.json({
      success: true,
      collections: formatted,
    });

  } catch (error) {
    console.error('Collections fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collections' },
      { status: 500 }
    );
  }
}

// POST - Create new collection
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { name, description, imageUrl } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Collection name is required' },
        { status: 400 }
      );
    }

    // Get merchant's store
    const store = await prisma.store.findFirst({
      where: { ownerId: user.id },
    });

    if (!store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }

    // Generate slug
    const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    let slug = baseSlug;
    let counter = 1;
    while (await prisma.collection.findFirst({ where: { storeId: store.id, slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const collection = await prisma.collection.create({
      data: {
        storeId: store.id,
        name,
        slug,
        description: description || null,
        imageUrl: imageUrl || null,
      },
    });

    return NextResponse.json({
      success: true,
      collection,
    });

  } catch (error) {
    console.error('Collection create error:', error);
    return NextResponse.json(
      { error: 'Failed to create collection' },
      { status: 500 }
    );
  }
}
