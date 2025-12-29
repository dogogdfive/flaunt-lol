const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ADMIN_WALLETS = [
  '5CoxdsuoRHDwDPVYqPoeiJxWZ588jXhpimCRJUj8FUN1',
  '6wdzyyBjxML8pWwKtyq8AqZYaKgy7kgqdhwkHnpzZxxV'
];

async function main() {
  for (const wallet of ADMIN_WALLETS) {
    // Check if user exists
    const existing = await prisma.user.findFirst({
      where: { walletAddress: wallet }
    });

    if (existing) {
      // Update to SUPER_ADMIN
      const updated = await prisma.user.update({
        where: { id: existing.id },
        data: { role: 'SUPER_ADMIN' }
      });
      console.log(`Updated ${wallet} to SUPER_ADMIN`);
    } else {
      // Create new SUPER_ADMIN user
      const created = await prisma.user.create({
        data: {
          walletAddress: wallet,
          role: 'SUPER_ADMIN'
        }
      });
      console.log(`Created SUPER_ADMIN user for ${wallet}`);
    }
  }

  // Show final state
  const admins = await prisma.user.findMany({
    where: { role: 'SUPER_ADMIN' }
  });
  console.log('\nSuper Admins:');
  admins.forEach(a => console.log(`  - ${a.walletAddress} (${a.id})`));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
