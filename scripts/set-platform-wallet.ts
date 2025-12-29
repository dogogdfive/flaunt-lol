// scripts/set-platform-wallet.ts
// Run with: npx ts-node scripts/set-platform-wallet.ts

import prisma from '../lib/prisma';

const PLATFORM_WALLET = '5CoxdsuoRHDwDPVYqPoeiJxWZ588jXhpimCRJUj8FUN1';

async function main() {
  console.log('Setting platform wallet...');

  // Upsert platform wallet setting
  await prisma.platformSettings.upsert({
    where: { key: 'platform_wallet' },
    update: {
      value: { value: PLATFORM_WALLET },
    },
    create: {
      key: 'platform_wallet',
      value: { value: PLATFORM_WALLET },
    },
  });

  // Also set platform fee
  await prisma.platformSettings.upsert({
    where: { key: 'platform_fee_percent' },
    update: {
      value: { value: 3.5 },
    },
    create: {
      key: 'platform_fee_percent',
      value: { value: 3.5 },
    },
  });

  console.log('✅ Platform wallet set to:', PLATFORM_WALLET);
  console.log('✅ Platform fee set to: 3.5%');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
