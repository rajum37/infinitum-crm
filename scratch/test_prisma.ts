import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testTransaction() {
  try {
    let plan;
    await prisma.$transaction(async (tx) => {
      plan = await tx.plan.create({
        data: {
          code: "TEST_SCRIPT_PLAN_2",
          name: "Test Script Plan 2",
          description: "Testing",
          status: "ACTIVE",
          planType: "STANDARD",
          basePrice: 0,
          billingInterval: "MONTH",
          currency: "INR",
          isPublic: true,
          isDefault: false,
        },
      });

      console.log("Plan created with ID:", plan.id);

      const feature = await tx.feature.findFirst();
      if(!feature) { console.log("No feature found"); return; }
      
      const features = [
        {
          featureId: feature.id,
          enabled: true,
          limitType: undefined,
          limitValue: 100,
          configuration: { foo: "bar" },
        }
      ];

      const featureCreates = features.map((f: any) => tx.planFeature.create({
        data: {
          planId: plan.id,
          featureId: f.featureId,
          enabled: f.enabled,
          limitType: f.limitType ?? undefined,
          limitValue: f.limitValue ?? undefined,
          configuration: f.configuration ?? undefined,
        },
      }));
      
      await Promise.all(featureCreates);
      console.log("Features created");
    });
    console.log("Transaction successful!");
  } catch (err) {
    console.error("Transaction failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

testTransaction();
