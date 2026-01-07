// app/api/merchant/products/[id]/route.ts
// Merchant endpoint to get, update, and delete a single product

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireMerchant } from '@/lib/auth';

// GET single product
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireMerchant();
    const productId = params.id;

    // Get merchant's stores
    const stores = await prisma.store.findMany({
      where: { ownerId: user.id },
      select: { id: true },
    });

    const storeIds = stores.map((s) => s.id);

    // Get the product (must belong to merchant's store)
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        storeId: { in: storeIds },
      },
      include: {
        store: {
          select: { name: true, slug: true },
        },
        category: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      product: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        priceSol: Number(product.priceSol),
        priceUsdc: product.priceUsdc ? Number(product.priceUsdc) : null,
        images: product.images,
        category: product.category,
        quantity: product.quantity,
        status: product.status,
        bondingEnabled: product.bondingEnabled,
        bondingGoal: product.bondingGoal,
        bondingCurrent: product.bondingCurrent,
        totalSold: product.totalSold,
        allowsShipping: product.allowsShipping,
        allowsLocalPickup: product.allowsLocalPickup,
        rejectionReason: product.rejectionReason,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        store: product.store,
      },
    });

  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}

// UPDATE product
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireMerchant();
    const productId = params.id;
    const body = await request.json();

    const {
      name,
      description,
      priceSol,
      priceUsdc,
      images,
      category,
      quantity,
      bondingEnabled,
      bondingGoal,
      allowsShipping,
      allowsLocalPickup,
      submitForReview,
    } = body;

    // Get merchant's stores
    const stores = await prisma.store.findMany({
      where: { ownerId: user.id },
      select: { id: true },
    });

    const storeIds = stores.map((s) => s.id);

    // Get the existing product
    const existingProduct = await prisma.product.findFirst({
      where: {
        id: productId,
        storeId: { in: storeIds },
      },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: any = {};

    if (name !== undefined) {
      updateData.name = name;
      // Update slug if name changed
      const baseSlug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      
      // Check for duplicate slug
      let slug = baseSlug;
      let counter = 1;
      while (true) {
        const existing = await prisma.product.findFirst({
          where: {
            storeId: existingProduct.storeId,
            slug,
            NOT: { id: productId },
          },
        });
        if (!existing) break;
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
      updateData.slug = slug;
    }

    if (description !== undefined) updateData.description = description;
    if (priceSol !== undefined) updateData.priceSol = priceSol;
    if (priceUsdc !== undefined) updateData.priceUsdc = priceUsdc;
    if (images !== undefined) updateData.images = images;

    // Handle category - can be ID, slug, or null
    if (category !== undefined) {
      if (!category) {
        updateData.categoryId = null;
      } else {
        // Try to find category by ID first, then by slug
        const foundCategory = await prisma.category.findFirst({
          where: {
            OR: [
              { id: category },
              { slug: category.toLowerCase() },
            ],
          },
        });
        updateData.categoryId = foundCategory?.id || null;
      }
    }

    if (quantity !== undefined) updateData.quantity = quantity;
    if (bondingEnabled !== undefined) updateData.bondingEnabled = bondingEnabled;
    if (bondingGoal !== undefined) updateData.bondingGoal = bondingGoal;
    if (allowsShipping !== undefined) updateData.allowsShipping = allowsShipping;
    if (allowsLocalPickup !== undefined) updateData.allowsLocalPickup = allowsLocalPickup;

    // Handle status change
    if (submitForReview) {
      // Can only submit for review if DRAFT or REJECTED
      if (existingProduct.status === 'DRAFT' || existingProduct.status === 'REJECTED') {
        updateData.status = 'PENDING';
        updateData.rejectionReason = null;
      }
    }

    // Check if name or images changed on an APPROVED product (these require admin review)
    // Price, inventory, description, and category can be changed without approval
    let requiresReview = false;
    if (existingProduct.status === 'APPROVED') {
      const majorChanges =
        (name !== undefined && name !== existingProduct.name) ||
        (images !== undefined && JSON.stringify(images) !== JSON.stringify(existingProduct.images));

      if (majorChanges) {
        // Set to pending for admin review
        updateData.status = 'PENDING';
        requiresReview = true;

        // Notify admins
        const admins = await prisma.user.findMany({
          where: { role: 'ADMIN' },
          select: { id: true },
        });

        if (admins.length > 0) {
          await prisma.notification.createMany({
            data: admins.map(admin => ({
              userId: admin.id,
              type: 'PRODUCT_UPDATED',
              title: `Product Updated: ${name || existingProduct.name}`,
              message: `A merchant has updated their product name or images and it needs re-approval.`,
              actionUrl: `/admin/products`,
            })),
          });
        }
      }
    }

    // Update the product
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: updateData,
    });

    let message = 'Product updated successfully';
    if (submitForReview) {
      message = 'Product submitted for review';
    } else if (requiresReview) {
      message = 'Product updated! Changes require admin approval before going live.';
    }

    return NextResponse.json({
      success: true,
      message,
      product: {
        id: updatedProduct.id,
        name: updatedProduct.name,
        slug: updatedProduct.slug,
        status: updatedProduct.status,
      },
      requiresReview,
    });

  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    );
  }
}

// DELETE product
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireMerchant();
    const productId = params.id;

    // Get merchant's stores
    const stores = await prisma.store.findMany({
      where: { ownerId: user.id },
      select: { id: true },
    });

    const storeIds = stores.map((s) => s.id);

    // Verify product belongs to merchant
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        storeId: { in: storeIds },
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Delete the product
    await prisma.product.delete({
      where: { id: productId },
    });

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully',
    });

  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}
