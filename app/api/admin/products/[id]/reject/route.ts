// app/api/admin/products/[id]/reject/route.ts
// Admin endpoint to reject a product

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

// REJECT product
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireAdmin();
    const productId = params.id;
    const { reason } = await request.json();

    if (!reason || reason.trim() === '') {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      );
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { store: { include: { owner: true } } },
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

    // Reject the product
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        status: 'REJECTED',
        rejectionReason: reason,
      },
    });

    // TODO: Send notification to merchant
    // await sendEmail(product.store.owner.email, 'Product Rejected', ...)

    return NextResponse.json({
      success: true,
      message: `Product "${product.name}" has been rejected`,
      product: {
        id: updatedProduct.id,
        name: updatedProduct.name,
        status: updatedProduct.status,
        rejectionReason: updatedProduct.rejectionReason,
      },
    });

  } catch (error) {
    console.error('Error rejecting product:', error);
    
    if (error instanceof Error && error.message === 'Admin access required') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to reject product' },
      { status: 500 }
    );
  }
}
