import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // Fix: ensure all plan_prices use the same currency as their parent plan
  const plans = await prisma.plan.findMany({
    include: { prices: true }
  });

  for (const plan of plans) {
    const planCurrency = plan.currency || "INR";
    const wrongCurrencyPrices = plan.prices.filter(p => p.currency !== planCurrency);
    if (wrongCurrencyPrices.length === 0) {
      console.log(`[${plan.name}] All prices already use ${planCurrency}`);
      continue;
    }
    for (const price of wrongCurrencyPrices) {
      await prisma.planPrice.update({
        where: { id: price.id },
        data: { currency: planCurrency }
      });
      console.log(`Fixed [${plan.name}] ${price.code}: ${price.currency} → ${planCurrency}`);
    }
  }
  console.log("Done.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
