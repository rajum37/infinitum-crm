const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const logs = await prisma.auditLog.findMany({
      where: {
        action: {
          contains: '_'
        }
      }
    });

    console.log(`Found ${logs.length} logs with underscores to update.`);

    for (const log of logs) {
      const formattedAction = (log.action || "")
        .split("_")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
        
      await prisma.auditLog.update({
        where: { id: log.id },
        data: { action: formattedAction }
      });
    }

    console.log("Successfully updated all legacy audit logs.");
  } catch (error) {
    console.error("Error migrating audit logs:", error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
