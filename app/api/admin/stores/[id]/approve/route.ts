// app/api/admin/stores/[id]/approve/route.ts
// Admin endpoint to approve a store

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin, promoteToMerchant } from '@/lib/auth';
import { notifyStoreApproved } from '@/lib/notifications';
import { sendStoreApproved } from '@/lib/email';

// APPROVE store
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireAdmin();
    const storeId = params.id;

    const store = await prisma.store.findUnique({
      where: { id: storeId },
      include: { owner: { select: { id: true, email: true, role: true } } },
    });

    if (!store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }

    if (store.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Store is not pending review' },
        { status: 400 }
      );
    }

    // Approve the store
    const updatedStore = await prisma.store.update({
      where: { id: storeId },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedById: admin.id,
        rejectionReason: null,
      },
    });

    // Promote owner to MERCHANT role if they're still a customer
    if (store.owner.role === 'CUSTOMER') {
      await promoteToMerchant(store.owner.id);
    }

    // Send notification to merchant
    await notifyStoreApproved(store.ownerId, store.id, store.name);

    // Send email to merchant if they have an email
    if (store.owner.email) {
      await sendStoreApproved(store.owner.email, store.name);
    } else if (store.contactEmail) {
      await sendStoreApproved(store.contactEmail, store.name);
    }

    return NextResponse.json({
      success: true,
      message: `Store "${store.name}" has been approved`,
      store: {
        id: updatedStore.id,
        name: updatedStore.name,
        slug: updatedStore.slug,
        status: updatedStore.status,
      },
    });

  } catch (error) {
    console.error('Error approving store:', error);
    
    if (error instanceof Error && error.message === 'Admin access required') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to approve store' },
      { status: 500 }
    );
  }
}
