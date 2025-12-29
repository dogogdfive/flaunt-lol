// app/api/stores/apply/route.ts
// API endpoint for merchants to apply to create a store

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendNewStoreSubmissionToAdmin } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    console.log('[Store Apply] ========== NEW APPLICATION ==========');

    // Get wallet address from header (from wallet-adapter)
    const walletAddress = request.headers.get('x-wallet-address');

    console.log('[Store Apply] Wallet address:', walletAddress);

    if (!walletAddress) {
      console.log('[Store Apply] FAILED: No wallet address');
      return NextResponse.json(
        { error: 'Please connect your wallet' },
        { status: 401 }
      );
    }

    const body = await request.json();
    console.log('[Store Apply] Form data received:', {
      storeName: body.storeName,
      category: body.category,
      country: body.country,
      hasLogo: !!body.logoUrl,
      hasBanner: !!body.bannerUrl,
      productImagesCount: body.productImages?.length || 0,
    });

    const {
      storeName,
      description,
      category,
      contactEmail,
      websiteUrl,
      twitterUrl,
      discordUrl,
      businessType,
      country,
      payoutWallet,
      logoUrl,
      bannerUrl,
      productImages,
    } = body;

    // Validate required fields
    if (!storeName || !description || !category || !contactEmail || !country || !payoutWallet) {
      console.log('[Store Apply] FAILED: Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactEmail)) {
      console.log('[Store Apply] FAILED: Invalid email format');
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    // Validate images
    if (!logoUrl || !bannerUrl || !productImages || productImages.length === 0) {
      console.log('[Store Apply] FAILED: Missing images');
      return NextResponse.json(
        { error: 'Please upload store logo, banner, and at least one product image' },
        { status: 400 }
      );
    }

    // Find or create user by wallet address
    console.log('[Store Apply] Looking up user by wallet...');

    let user = await prisma.user.findFirst({
      where: { walletAddress },
    });

    if (!user) {
      console.log('[Store Apply] Creating new user in database...');
      user = await prisma.user.create({
        data: {
          walletAddress,
          email: contactEmail, // Use the provided contact email
          role: 'CUSTOMER',
        },
      });
      console.log('[Store Apply] Created user:', user.id);
    } else {
      console.log('[Store Apply] Found existing user:', user.id);
    }

    // Check if user already has a store with this name
    const existingStoreWithName = await prisma.store.findFirst({
      where: {
        ownerId: user.id,
        name: storeName,
      },
    });

    if (existingStoreWithName) {
      console.log('[Store Apply] FAILED: User already has store with this name:', existingStoreWithName.id);
      return NextResponse.json(
        { error: 'You already have a store with this name' },
        { status: 400 }
      );
    }

    // Count existing stores - limit to 5 stores per user
    const storeCount = await prisma.store.count({
      where: { ownerId: user.id },
    });

    if (storeCount >= 5) {
      console.log('[Store Apply] FAILED: User has reached store limit');
      return NextResponse.json(
        { error: 'You have reached the maximum number of stores (5)' },
        { status: 400 }
      );
    }

    // If user already has an approved store, they become a merchant
    const hasApprovedStore = await prisma.store.findFirst({
      where: { ownerId: user.id, status: 'APPROVED' },
    });

    console.log('[Store Apply] User has approved store:', !!hasApprovedStore, '| Store count:', storeCount);

    // Generate slug from store name
    const baseSlug = storeName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Check for duplicate slug
    let slug = baseSlug;
    let counter = 1;
    while (await prisma.store.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    console.log('[Store Apply] Generated slug:', slug);

    // Create the store in PENDING status
    console.log('[Store Apply] Creating store with PENDING status...');
    const store = await prisma.store.create({
      data: {
        ownerId: user.id,
        name: storeName,
        slug,
        description,
        status: 'PENDING',
        payoutWallet,
        contactEmail,
        logoUrl,
        bannerUrl,
        websiteUrl: websiteUrl || null,
        twitterUrl: twitterUrl || null,
        discordUrl: discordUrl || null,
      },
    });

    console.log('[Store Apply] SUCCESS! Store created:', {
      id: store.id,
      slug: store.slug,
      status: store.status,
      ownerId: store.ownerId,
    });

    // Send email notification to admins
    const admins = await prisma.user.findMany({
      where: {
        role: { in: ['ADMIN', 'SUPER_ADMIN'] },
        email: { not: null },
      },
      select: { email: true },
    });

    for (const admin of admins) {
      if (admin.email) {
        sendNewStoreSubmissionToAdmin(admin.email, {
          storeName: store.name,
          storeId: store.id,
          ownerWallet: walletAddress,
          description: description || undefined,
        }).catch(err => console.error('Failed to send admin notification:', err));
      }
    }

    console.log('[Store Apply] ========== APPLICATION COMPLETE ==========');

    return NextResponse.json({
      success: true,
      message: 'Application submitted successfully',
      store: {
        id: store.id,
        slug: store.slug,
        status: store.status,
      },
    });

  } catch (error) {
    console.error('Error submitting store application:', error);
    return NextResponse.json(
      { error: 'Failed to submit application' },
      { status: 500 }
    );
  }
}