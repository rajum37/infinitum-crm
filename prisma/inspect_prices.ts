import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const prices = await prisma.planPrice.findMany({
    include: { plan: { select: { name: true } } },
    orderBy: [{ plan: { name: "asc" } }, { billingInterval: "asc" }, { version: "asc" }],
  });

  for (const p of prices) {
    console.log(`[${p.plan.name}] ${p.code} | ${p.billingInterval} | amount=${p.amount} | isDefault=${p.isDefault} | isActive=${p.isActive}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
