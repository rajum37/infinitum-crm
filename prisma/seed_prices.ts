import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const plans = await prisma.plan.findMany({
    where: { status: "ACTIVE", isPublic: true },
  });

  console.log(`Found ${plans.length} active public plans. Seeding alternate frequencies...`);

  for (const plan of plans) {
    const monthlyPrice = Number(plan.basePrice);

    // Create Yearly price (10% discount)
    await prisma.planPrice.upsert({
      where: {
        planId_billingInterval_intervalCount: {
          planId: plan.id,
          billingInterval: "YEAR",
          intervalCount: 1
        }
      },
      update: {},
      create: {
        planId: plan.id,
        billingInterval: "YEAR",
        intervalCount: 1,
        currency: "USD",
        amount: monthlyPrice * 12 * 0.9,
        originalAmount: monthlyPrice * 12,
        discountPercent: 10,
        isActive: true,
        isDefault: false
      }
    });
    
    // Create Quarterly price (5% discount)
    await prisma.planPrice.upsert({
      where: {
        planId_billingInterval_intervalCount: {
          planId: plan.id,
          billingInterval: "QUARTER",
          intervalCount: 1
        }
      },
      update: {},
      create: {
        planId: plan.id,
        billingInterval: "QUARTER",
        intervalCount: 1,
        currency: "USD",
        amount: monthlyPrice * 3 * 0.95,
        originalAmount: monthlyPrice * 3,
        discountPercent: 5,
        isActive: true,
        isDefault: false
      }
    });

    console.log(`- Seeded YEAR and QUARTER prices for plan: ${plan.name}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
