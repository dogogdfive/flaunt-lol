// app/api/merchant/store/route.ts
// Get and update merchant's store information

import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for auth headers
export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// GET merchant's store
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    console.log('[Merchant Store API] User:', user.id, user.walletAddress);

    // Get merchant's primary store
    const store = await prisma.store.findFirst({
      where: { ownerId: user.id },
      include: {
        _count: {
          select: {
            products: true,
            orders: true,
          },
        },
      },
    });

    console.log('[Merchant Store API] Store found:', store?.id, store?.name, store?.status);

    if (!store) {
      return NextResponse.json({
        success: true,
        store: null,
        message: 'No store found',
      });
    }

    return NextResponse.json({
      success: true,
      store: {
        id: store.id,
        name: store.name,
        slug: store.slug,
        description: store.description,
        logoUrl: store.logoUrl,
        bannerUrl: store.bannerUrl,
        status: store.status,
        payoutWallet: store.payoutWallet,
        websiteUrl: store.websiteUrl,
        twitterUrl: store.twitterUrl,
        discordUrl: store.discordUrl,
        telegramUrl: store.telegramUrl,
        // Shipping info
        contactEmail: store.contactEmail,
        contactPhone: store.contactPhone,
        businessName: store.businessName,
        businessAddress: store.businessAddress,
        businessCity: store.businessCity,
        businessState: store.businessState,
        businessZip: store.businessZip,
        businessCountry: store.businessCountry,
        showLocation: store.showLocation,
        latitude: store.latitude,
        longitude: store.longitude,
        totalSales: Number(store.totalSales),
        totalOrders: store.totalOrders,
        productCount: store._count.products,
        orderCount: store._count.orders,
        createdAt: store.createdAt,
      },
    });

  } catch (error: any) {
    console.error('Error fetching merchant store:', error);
    console.error('Error stack:', error?.stack);
    console.error('Error message:', error?.message);
    return NextResponse.json(
      { error: 'Failed to fetch store', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

// PATCH - Update merchant's store
export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const {
      name,
      description,
      logoUrl,
      bannerUrl,
      payoutWallet,
      websiteUrl,
      twitterUrl,
      discordUrl,
      telegramUrl,
      // Shipping info
      contactEmail,
      contactPhone,
      businessName,
      businessAddress,
      businessCity,
      businessState,
      businessZip,
      businessCountry,
      showLocation,
    } = body;

    // Get merchant's store
    const store = await prisma.store.findFirst({
      where: { ownerId: user.id },
    });

    if (!store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }

    // Track what changed for admin notification
    const changes: string[] = [];
    if (name !== undefined && name !== store.name) {
      changes.push(`Name: "${store.name}" → "${name}"`);
    }
    if (logoUrl !== undefined && logoUrl !== store.logoUrl) {
      changes.push('Logo updated');
    }
    if (bannerUrl !== undefined && bannerUrl !== store.bannerUrl) {
      changes.push('Banner updated');
    }

    // Build update data
    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
    if (bannerUrl !== undefined) updateData.bannerUrl = bannerUrl;
    if (payoutWallet !== undefined) updateData.payoutWallet = payoutWallet;
    if (websiteUrl !== undefined) updateData.websiteUrl = websiteUrl;
    if (twitterUrl !== undefined) updateData.twitterUrl = twitterUrl;
    if (discordUrl !== undefined) updateData.discordUrl = discordUrl;
    if (telegramUrl !== undefined) updateData.telegramUrl = telegramUrl;
    // Shipping info
    if (contactEmail !== undefined) updateData.contactEmail = contactEmail;
    if (contactPhone !== undefined) updateData.contactPhone = contactPhone;
    if (businessName !== undefined) updateData.businessName = businessName;
    if (businessAddress !== undefined) updateData.businessAddress = businessAddress;
    if (businessCity !== undefined) updateData.businessCity = businessCity;
    if (businessState !== undefined) updateData.businessState = businessState;
    if (businessZip !== undefined) updateData.businessZip = businessZip;
    if (businessCountry !== undefined) updateData.businessCountry = businessCountry;
    if (showLocation !== undefined) updateData.showLocation = showLocation;

    // Update the store
    const updatedStore = await prisma.store.update({
      where: { id: store.id },
      data: updateData,
    });

    // If name, logo, or banner changed, notify admins for review
    if (changes.length > 0) {
      // Get all admin users
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true },
      });

      // Create notifications for all admins
      if (admins.length > 0) {
        await prisma.notification.createMany({
          data: admins.map(admin => ({
            userId: admin.id,
            type: 'STORE_UPDATE',
            title: `Store Updated: ${updatedStore.name}`,
            message: `${store.name} has made changes that may need review:\n${changes.join('\n')}`,
            actionUrl: `/admin/stores/${store.id}`,
          })),
        });
      }

      console.log(`[Merchant Store] Changes detected for ${store.name}:`, changes);
    }

    return NextResponse.json({
      success: true,
      message: changes.length > 0
        ? 'Store updated successfully. Changes sent for admin review.'
        : 'Store updated successfully',
      store: {
        id: updatedStore.id,
        name: updatedStore.name,
        slug: updatedStore.slug,
      },
      pendingReview: changes.length > 0,
    });

  } catch (error) {
    console.error('Error updating store:', error);
    return NextResponse.json(
      { error: 'Failed to update store' },
      { status: 500 }
    );
  }
}
