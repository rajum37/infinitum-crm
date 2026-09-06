const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function backfillOwners() {
  const companies = await prisma.company.findMany({
    where: { ownerUserId: null },
    include: {
      users: {
        where: { role: 'ADMIN', isDeleted: false, isActive: true },
        orderBy: { createdAt: 'asc' },
        take: 1
      }
    }
  });
  
  for (const company of companies) {
    if (company.users.length > 0) {
      const owner = company.users[0];
      await prisma.company.update({
        where: { id: company.id },
        data: { ownerUserId: owner.id }
      });
      console.log(`Updated company ${company.name} with owner ${owner.name} (${owner.id})`);
    } else {
      console.log(`Company ${company.name} has no active admins.`);
    }
  }
}

backfillOwners().catch(console.error).finally(() => prisma.$disconnect());
