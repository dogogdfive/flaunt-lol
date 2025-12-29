// app/api/merchant/orders/[id]/notes/route.ts
// Merchant private notes on orders

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// PUT - Update merchant notes
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    if (!walletAddress) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orderId = params.id;
    const body = await request.json();
    const { notes } = body;

    // Get order with store verification
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        store: {
          select: {
            owner: { select: { walletAddress: true } },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Verify merchant owns this store
    if (order.store.owner.walletAddress !== walletAddress) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Update notes
    await prisma.order.update({
      where: { id: orderId },
      data: { merchantNotes: notes },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update notes error:', error);
    return NextResponse.json({ error: 'Failed to update notes' }, { status: 500 });
  }
}
