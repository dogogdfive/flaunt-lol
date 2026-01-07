// prisma/seed.ts
// Database seeding script - creates initial super admin and platform settings

import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // ==========================================
  // 1. CREATE SUPER ADMIN
  // ==========================================
  // IMPORTANT: Replace these values with your actual wallet address!
  
  const superAdmin = await prisma.user.upsert({
    where: { walletAddress: 'YOUR_WALLET_ADDRESS_HERE' }, // <-- CHANGE THIS!
    update: {
      role: 'SUPER_ADMIN',
    },
    create: {
      walletAddress: 'YOUR_WALLET_ADDRESS_HERE', // <-- CHANGE THIS!
      email: 'admin@flaunt.lol', // Optional: your email
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
      isVerified: true,
    },
  });

  console.log('✅ Super Admin created:', superAdmin.id);

  // ==========================================
  // 2. CREATE PLATFORM SETTINGS
  // ==========================================
  
  const settings = [
    { key: 'platform_fee_percent', value: { value: 3.5 } },
    { key: 'min_payout_sol', value: { value: 0.5 } },
    { key: 'min_payout_usdc', value: { value: 10 } },
    { key: 'payout_hold_days', value: { value: 7 } },
    { key: 'auto_payout_enabled', value: { value: true } },
    { key: 'auto_payout_schedule', value: { value: 'weekly' } }, // daily, weekly, biweekly, monthly
    { key: 'platform_wallet', value: { value: 'YOUR_PLATFORM_WALLET_ADDRESS' } }, // <-- CHANGE THIS!
    { key: 'usdc_mint', value: { value: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' } }, // USDC on mainnet
  ];

  for (const setting of settings) {
    await prisma.platformSettings.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }

  console.log('✅ Platform settings created');

  // ==========================================
  // 3. CREATE CATEGORIES
  // ==========================================

  const categories = [
    { name: 'Clothing', slug: 'clothing', description: 'Apparel and fashion items', sortOrder: 1 },
    { name: 'Accessories', slug: 'accessories', description: 'Fashion accessories and add-ons', sortOrder: 2 },
    { name: 'Collectibles', slug: 'collectibles', description: 'Rare and collectible items', sortOrder: 3 },
    { name: 'Art', slug: 'art', description: 'Artwork and creative pieces', sortOrder: 4 },
    { name: 'Animals/Pets', slug: 'animals', description: 'Live animals, pets, and livestock', sortOrder: 5 },
    { name: 'Digital', slug: 'digital', description: 'Digital goods and downloads', sortOrder: 6 },
    { name: 'Other', slug: 'other', description: 'Miscellaneous items', sortOrder: 7 },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name, description: category.description, sortOrder: category.sortOrder },
      create: { ...category, isActive: true },
    });
  }

  console.log('✅ Categories created');

  // ==========================================
  // 4. CREATE SAMPLE DATA (Optional - for testing)
  // ==========================================

  // Uncomment below to create test data

  /*
  // Create a test merchant
  const testMerchant = await prisma.user.upsert({
    where: { email: 'merchant@test.com' },
    update: {},
    create: {
      email: 'merchant@test.com',
      name: 'Test Merchant',
      role: 'MERCHANT',
      walletAddress: 'TEST_MERCHANT_WALLET',
    },
  });

  // Create a test store
  const testStore = await prisma.store.upsert({
    where: { slug: 'test-store' },
    update: {},
    create: {
      name: 'Test Store',
      slug: 'test-store',
      description: 'A test store for development',
      ownerId: testMerchant.id,
      status: 'APPROVED',
      payoutWallet: 'TEST_PAYOUT_WALLET',
    },
  });

  // Create test products
  await prisma.product.createMany({
    data: [
      {
        storeId: testStore.id,
        name: 'Test Hoodie',
        slug: 'test-hoodie',
        description: 'A comfortable test hoodie',
        priceSol: 0.5,
        quantity: 100,
        status: 'APPROVED',
        images: JSON.stringify(['https://placeholder.com/hoodie.jpg']),
      },
      {
        storeId: testStore.id,
        name: 'Test T-Shirt',
        slug: 'test-tshirt',
        description: 'A cool test t-shirt',
        priceSol: 0.25,
        quantity: 200,
        status: 'APPROVED',
        images: JSON.stringify(['https://placeholder.com/tshirt.jpg']),
      },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Test data created');
  */

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
