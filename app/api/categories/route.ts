// app/api/categories/route.ts
// Public categories API - returns active categories for product filtering

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - Get all active categories (public endpoint)
export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        imageUrl: true,
      },
    });

    return NextResponse.json({
      success: true,
      categories,
    });

  } catch (error) {
    console.error('Categories fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}
