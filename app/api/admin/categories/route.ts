// app/api/admin/categories/route.ts
// Admin categories management API

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

// GET - Get all categories
export async function GET(request: NextRequest) {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    const formatted = categories.map(c => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      imageUrl: c.imageUrl,
      isActive: c.isActive,
      sortOrder: c.sortOrder,
      productCount: c._count.products,
      createdAt: c.createdAt,
    }));

    return NextResponse.json({
      success: true,
      categories: formatted,
    });

  } catch (error) {
    console.error('Categories fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

// POST - Create new category (Admin only)
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { name, description, imageUrl, isActive = true } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      );
    }

    // Generate slug
    const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    let slug = baseSlug;
    let counter = 1;
    while (await prisma.category.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Get max sort order
    const maxSort = await prisma.category.aggregate({
      _max: { sortOrder: true },
    });

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        description: description || null,
        imageUrl: imageUrl || null,
        isActive,
        sortOrder: (maxSort._max.sortOrder || 0) + 1,
      },
    });

    return NextResponse.json({
      success: true,
      category,
    });

  } catch (error) {
    console.error('Category create error:', error);

    if (error instanceof Error && error.message === 'Admin access required') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    );
  }
}

// PATCH - Update category (Admin only)
export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { id, name, description, imageUrl, isActive, sortOrder } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (name !== undefined) {
      updateData.name = name;
      // Update slug if name changes
      const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      let slug = baseSlug;
      let counter = 1;
      while (await prisma.category.findFirst({ where: { slug, id: { not: id } } })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
      updateData.slug = slug;
    }
    if (description !== undefined) updateData.description = description;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

    const category = await prisma.category.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      category,
    });

  } catch (error) {
    console.error('Category update error:', error);
    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500 }
    );
  }
}

// DELETE - Delete category (Admin only)
export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 }
      );
    }

    // Check if category has products
    const category = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });

    if (category && category._count.products > 0) {
      return NextResponse.json(
        { error: `Cannot delete category with ${category._count.products} products. Remove products first.` },
        { status: 400 }
      );
    }

    await prisma.category.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: 'Category deleted',
    });

  } catch (error) {
    console.error('Category delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    );
  }
}
