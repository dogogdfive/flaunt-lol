const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Check for users with wallet starting with MCDC
  const users = await prisma.user.findMany({
    where: { walletAddress: { startsWith: 'MCDC' } }
  });
  console.log('Users with MCDC wallet:', users.length);
  users.forEach(u => console.log('  Wallet:', u.walletAddress, '| Role:', u.role));

  // Get all stores with owner info
  const stores = await prisma.store.findMany({
    include: { owner: { select: { walletAddress: true } } }
  });
  console.log('\nAll stores:');
  stores.forEach(s => console.log('  ', s.name, '| Status:', s.status, '| Owner:', s.owner?.walletAddress));
}

main().catch(console.error).finally(() => prisma.$disconnect());
