// app/api/settings/public/route.ts
// Public settings API - returns non-sensitive platform settings

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const DEFAULT_PLATFORM_WALLET = '5CoxdsuoRHDwDPVYqPoeiJxWZ588jXhpimCRJUj8FUN1';

export async function GET() {
  try {
    // Fetch public settings from database
    const settings = await prisma.platformSettings.findMany({
      where: {
        key: {
          in: ['platform_wallet', 'platform_fee_percent'],
        },
      },
    });

    const settingsMap: Record<string, any> = {};
    for (const setting of settings) {
      if (setting.value && typeof setting.value === 'object' && 'value' in setting.value) {
        settingsMap[setting.key] = (setting.value as { value: any }).value;
      }
    }

    return NextResponse.json({
      success: true,
      platformWallet: settingsMap.platform_wallet || DEFAULT_PLATFORM_WALLET,
      platformFeePercent: settingsMap.platform_fee_percent || 3.5,
    });
  } catch (error) {
    console.error('Error fetching public settings:', error);
    return NextResponse.json({
      success: true,
      platformWallet: DEFAULT_PLATFORM_WALLET,
      platformFeePercent: 3.5,
    });
  }
}
