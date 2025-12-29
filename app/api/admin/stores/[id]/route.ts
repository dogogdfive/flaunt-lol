// app/api/admin/stores/[id]/route.ts
// Admin API for getting and editing individual store details

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

// GET - Get store details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();

    const store = await prisma.store.findUnique({
      where: { id: params.id },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            walletAddress: true,
          },
        },
        products: {
          select: {
            id: true,
            name: true,
            slug: true,
            priceSol: true,
            status: true,
            images: true,
            quantity: true,
          },
        },
        _count: {
          select: {
            products: true,
            orders: true,
          },
        },
      },
    });

    if (!store) {
      return NextResponse.json({ success: false, error: 'Store not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, store });
  } catch (error) {
    console.error('Error fetching store:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch store' },
      { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}

// PATCH - Update store details
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();

    const body = await request.json();
    const {
      name,
      description,
      logoUrl,
      bannerUrl,
      websiteUrl,
      twitterUrl,
      discordUrl,
      payoutWallet,
      contactEmail,
      isVerified,
      status,
    } = body;

    // Build update data - only include fields that were provided
    const updateData: any = {};

    if (name !== undefined) {
      updateData.name = name;
      // Generate new slug if name changed
      updateData.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }
    if (description !== undefined) updateData.description = description;
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
    if (bannerUrl !== undefined) updateData.bannerUrl = bannerUrl;
    if (websiteUrl !== undefined) updateData.websiteUrl = websiteUrl;
    if (twitterUrl !== undefined) updateData.twitterUrl = twitterUrl;
    if (discordUrl !== undefined) updateData.discordUrl = discordUrl;
    if (payoutWallet !== undefined) updateData.payoutWallet = payoutWallet;
    if (contactEmail !== undefined) updateData.contactEmail = contactEmail;
    if (isVerified !== undefined) updateData.isVerified = isVerified;
    if (status !== undefined) updateData.status = status;

    const updatedStore = await prisma.store.update({
      where: { id: params.id },
      data: updateData,
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            walletAddress: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, store: updatedStore });
  } catch (error) {
    console.error('Error updating store:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update store' },
      { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}

// DELETE - Delete store
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();

    // Delete store and all related data
    await prisma.store.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true, message: 'Store deleted successfully' });
  } catch (error) {
    console.error('Error deleting store:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to delete store' },
      { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}
