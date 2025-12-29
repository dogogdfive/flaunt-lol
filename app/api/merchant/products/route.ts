// app/api/merchant/products/route.ts
// Merchant endpoint to create and manage products

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireMerchant } from '@/lib/auth';
import { sendNewProductSubmissionToAdmin } from '@/lib/email';

// GET merchant's products
export async function GET(request: NextRequest) {
  try {
    const user = await requireMerchant();

    // Get merchant's store(s)
    const stores = await prisma.store.findMany({
      where: { ownerId: user.id },
      select: { id: true },
    });

    const storeIds = stores.map((s) => s.id);

    // Get all products from merchant's stores
    const products = await prisma.product.findMany({
      where: { storeId: { in: storeIds } },
      orderBy: { createdAt: 'desc' },
      include: {
        store: {
          select: { name: true, slug: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      products,
    });

  } catch (error) {
    console.error('Error fetching merchant products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

// CREATE new product
export async function POST(request: NextRequest) {
  try {
    const user = await requireMerchant();
    const body = await request.json();

    const {
      storeId,
      name,
      description,
      priceSol,
      priceUsdc,
      images,
      category,
      quantity,
      productType,
      weightGrams,
      bondingEnabled,
      bondingGoal,
      submitForReview, // true = PENDING, false = DRAFT
    } = body;

    // Validate required fields
    if (!storeId || !name || priceSol === undefined) {
      return NextResponse.json(
        { error: 'Store ID, name, and price are required' },
        { status: 400 }
      );
    }

    // Verify merchant owns this store
    const store = await prisma.store.findFirst({
      where: {
        id: storeId,
        ownerId: user.id,
      },
    });

    if (!store) {
      return NextResponse.json(
        { error: 'Store not found or you do not own it' },
        { status: 404 }
      );
    }

    // Check if store is approved
    if (store.status !== 'APPROVED') {
      return NextResponse.json(
        { error: 'Your store must be approved before adding products' },
        { status: 400 }
      );
    }

    // Generate slug from name
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    
    // Check for duplicate slug in this store
    let slug = baseSlug;
    let counter = 1;
    while (await prisma.product.findFirst({ where: { storeId, slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Create the product
    const product = await prisma.product.create({
      data: {
        storeId,
        name,
        slug,
        description: description || null,
        priceSol,
        priceUsdc: priceUsdc || null,
        images: images || [],
        quantity: quantity || 0,
        bondingEnabled: bondingEnabled || false,
        bondingGoal: bondingGoal || 100,
        // Set status based on whether submitting for review
        status: submitForReview ? 'PENDING' : 'DRAFT',
      },
    });

    // Send email notification to admins if submitted for review
    if (submitForReview) {
      // Get admin emails
      const admins = await prisma.user.findMany({
        where: {
          role: { in: ['ADMIN', 'SUPER_ADMIN'] },
          email: { not: null },
        },
        select: { email: true },
      });

      // Send email to each admin
      for (const admin of admins) {
        if (admin.email) {
          sendNewProductSubmissionToAdmin(admin.email, {
            productName: product.name,
            productId: product.id,
            storeName: store.name,
            storeSlug: store.slug,
            merchantWallet: user.walletAddress || '',
            priceUsdc: priceUsdc ? String(priceUsdc) : undefined,
            images: images || [],
          }).catch(err => console.error('Failed to send admin notification:', err));
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: submitForReview
        ? 'Product submitted for review. We\'ll notify you once it\'s approved!'
        : 'Product saved as draft',
      product: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        status: product.status,
      },
    });

  } catch (error) {
    console.error('Error creating product:', error);
    
    if (error instanceof Error && error.message === 'Merchant access required') {
      return NextResponse.json(
        { error: 'Merchant access required' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}
