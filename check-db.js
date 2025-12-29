const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log('=== ALL USERS ===');
  console.log('Total:', users.length);
  users.forEach(u => {
    console.log('  -', u.walletAddress, '| Role:', u.role);
  });
  console.log('');

  const stores = await prisma.store.findMany({
    include: {
      owner: {
        select: { walletAddress: true, role: true }
      }
    }
  });

  console.log('=== STORES ===');
  console.log('Total:', stores.length);
  stores.forEach(s => {
    console.log('Store:', s.name);
    console.log('  Status:', s.status);
    console.log('  Owner Wallet:', s.owner.walletAddress);
    console.log('');
  });

  const orders = await prisma.order.findMany({ take: 5 });
  console.log('=== ORDERS (first 5) ===');
  console.log('Total orders:', await prisma.order.count());
  orders.forEach(o => {
    console.log('  -', o.orderNumber, '| Status:', o.status);
  });
}

main().finally(() => prisma.$disconnect());
