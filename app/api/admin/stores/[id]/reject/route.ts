// app/api/admin/stores/[id]/reject/route.ts
// Admin endpoint to reject a store

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { sendStoreRejected } from '@/lib/email';

// REJECT store
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireAdmin();
    const storeId = params.id;
    const { reason } = await request.json();

    if (!reason || reason.trim() === '') {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      );
    }

    const store = await prisma.store.findUnique({
      where: { id: storeId },
      include: { owner: true },
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

    // Reject the store
    const updatedStore = await prisma.store.update({
      where: { id: storeId },
      data: {
        status: 'REJECTED',
        rejectionReason: reason,
      },
    });

    // Send rejection email to merchant
    const recipientEmail = store.contactEmail || store.owner.email;
    if (recipientEmail) {
      sendStoreRejected(recipientEmail, store.name, reason)
        .catch(err => console.error('Failed to send rejection email:', err));
    }

    return NextResponse.json({
      success: true,
      message: `Store "${store.name}" has been rejected`,
      store: {
        id: updatedStore.id,
        name: updatedStore.name,
        status: updatedStore.status,
        rejectionReason: updatedStore.rejectionReason,
      },
    });

  } catch (error) {
    console.error('Error rejecting store:', error);
    
    if (error instanceof Error && error.message === 'Admin access required') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to reject store' },
      { status: 500 }
    );
  }
}
