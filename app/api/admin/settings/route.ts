// app/api/admin/settings/route.ts
// Admin API to get and update platform settings

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

// GET - Fetch all platform settings
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const settingsRows = await prisma.platformSettings.findMany();

    const settings: Record<string, any> = {};
    for (const row of settingsRows) {
      const value = row.value as any;
      settings[row.key] = value?.value ?? value;
    }

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error('Admin settings GET error:', error);

    if (error instanceof Error && error.message === 'Admin access required') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

// POST - Update platform settings
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const {
      platform_wallet,
      platform_fee_percent,
      min_payout_sol,
      min_payout_usdc,
      payout_hold_days,
    } = body;

    // Update each setting
    const updates = [
      { key: 'platform_wallet', value: { value: platform_wallet } },
      { key: 'platform_fee_percent', value: { value: platform_fee_percent } },
      { key: 'min_payout_sol', value: { value: min_payout_sol } },
      { key: 'min_payout_usdc', value: { value: min_payout_usdc } },
      { key: 'payout_hold_days', value: { value: payout_hold_days } },
    ];

    for (const update of updates) {
      if (update.value.value !== undefined) {
        await prisma.platformSettings.upsert({
          where: { key: update.key },
          update: { value: update.value },
          create: { key: update.key, value: update.value },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
    });
  } catch (error) {
    console.error('Admin settings POST error:', error);

    if (error instanceof Error && error.message === 'Admin access required') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
