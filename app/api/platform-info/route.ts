// app/api/platform-info/route.ts
// Public API to get platform information (fee, etc.)

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const setting = await prisma.platformSettings.findUnique({
      where: { key: 'platform_fee_percent' },
    });

    let platformFeePercent = 3.5; // Default
    if (setting?.value && typeof setting.value === 'object' && 'value' in setting.value) {
      platformFeePercent = Number((setting.value as { value: number }).value) || 3.5;
    }

    return NextResponse.json({
      success: true,
      platformFeePercent,
    });
  } catch (error) {
    console.error('Platform info error:', error);
    return NextResponse.json({
      success: true,
      platformFeePercent: 3.5, // Return default on error
    });
  }
}
