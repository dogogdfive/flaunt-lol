// app/api/admin/products/[id]/approve/route.ts
// Admin endpoint to approve a product

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { notifyProductApproved } from '@/lib/notifications';
import { sendProductApproved } from '@/lib/email';

// APPROVE product
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireAdmin();
    const productId = params.id;

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        store: {
          include: {
            owner: { select: { id: true, email: true } }
          }
        }
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    if (product.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Product is not pending review' },
        { status: 400 }
      );
    }

    // Approve the product
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedById: admin.id,
        rejectionReason: null,
      },
    });

    // Send notification to merchant
    await notifyProductApproved(product.store.ownerId, product.id, product.name);

    // Send email to merchant if they have an email
    if (product.store.owner.email) {
      await sendProductApproved(product.store.owner.email, product.name, product.store.name);
    } else if (product.store.contactEmail) {
      await sendProductApproved(product.store.contactEmail, product.name, product.store.name);
    }

    return NextResponse.json({
      success: true,
      message: `Product "${product.name}" has been approved`,
      product: {
        id: updatedProduct.id,
        name: updatedProduct.name,
        status: updatedProduct.status,
      },
    });

  } catch (error) {
    console.error('Error approving product:', error);
    
    if (error instanceof Error && error.message === 'Admin access required') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to approve product' },
      { status: 500 }
    );
  }
}
