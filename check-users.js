const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      walletAddress: true,
      role: true,
    }
  });

  console.log('Users in database:');
  console.log(JSON.stringify(users, null, 2));
  console.log(`\nTotal: ${users.length} users`);

  const byRole = users.reduce((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {});
  console.log('By role:', byRole);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
