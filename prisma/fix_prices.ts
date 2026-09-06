import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const plans = await prisma.plan.findMany({ orderBy: { name: "asc" } });
  for (const p of plans) {
    console.log(`${p.name} | code=${p.code} | basePrice=${p.basePrice} | billingInterval=${p.billingInterval} | currency=${p.currency}`);
  }

  // Fix: update plan prices to use actual base_price from plans
  // Monthly: base_price
  // Quarterly: base_price * 3 * 0.95
  // Half-Year: base_price * 6 * 0.92
  // Yearly: base_price * 12 * 0.88
  console.log("\nFixing prices...");
  for (const plan of plans) {
    const base = Number(plan.basePrice);
    const prices = [
      { interval: "MONTH", amount: base },
      { interval: "QUARTER", amount: Math.round(base * 3 * 0.95 * 100) / 100 },
      { interval: "HALF_YEAR", amount: Math.round(base * 6 * 0.92 * 100) / 100 },
      { interval: "YEAR", amount: Math.round(base * 12 * 0.88 * 100) / 100 },
    ];

    for (const { interval, amount } of prices) {
      const existing = await prisma.planPrice.findFirst({
        where: { planId: plan.id, billingInterval: interval as any, version: 1 }
      });
      if (existing && Number(existing.amount) === 0) {
        await prisma.planPrice.update({
          where: { id: existing.id },
          data: {
            amount,
            originalAmount: interval === "MONTH" ? undefined : base * (interval === "QUARTER" ? 3 : interval === "HALF_YEAR" ? 6 : 12),
          }
        });
        console.log(`Updated ${plan.code}-${interval}-V1: $${amount}`);
      } else if (!existing) {
        // Create missing HALF_YEAR
        const code = `${plan.code}-${interval}-V1`;
        await prisma.planPrice.create({
          data: {
            planId: plan.id,
            code,
            version: 1,
            billingInterval: interval as any,
            intervalCount: 1,
            currency: plan.currency || "",
            amount,
            originalAmount: base * (interval === "QUARTER" ? 3 : interval === "HALF_YEAR" ? 6 : 12),
            isActive: true,
            isDefault: false,
          }
        });
        console.log(`Created ${code}: $${amount}`);
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
