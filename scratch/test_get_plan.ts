import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testGet() {
  try {
    const plan = await prisma.plan.findUnique({
      where: { id: "a3a0e66b-8515-4fa7-b845-a4f66a8db618" }, // Dummy UUID
      include: {
        prices: {
          orderBy: [{ billingInterval: 'asc' }, { version: 'desc' }]
        },
        features: {
          include: {
            feature: true
          }
        }
      }
    });
    console.log("Success:", !!plan);
  } catch (err) {
    console.error("GET Prisma Error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

testGet();
