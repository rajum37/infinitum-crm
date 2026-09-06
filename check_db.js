const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$queryRaw`SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'Role'`;
  console.log("ROLE ENUM IN DB:", result);
  const migs = await prisma.$queryRaw`SELECT * FROM _prisma_migrations`.catch(e => "No _prisma_migrations table");
  console.log("MIGRATIONS TABLE:", migs);
}
main().finally(() => prisma.$disconnect());
