const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function test() {
  try {
    const search = '';
    const category = '';
    const severity = '';
    const page = 1;
    const limit = 10;
    const offset = 0;
    
    let whereSql = '1=1';
    const params = [];
    let paramIndex = 1;

    const allowedEmails = ['admin@example.com', 'user@example.com'];
    whereSql += ` AND metadata->>'actorEmail' = ANY($${paramIndex}::text[])`;
    params.push(allowedEmails);
    paramIndex++;

    const countResult = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as total FROM audit_logs WHERE ${whereSql}`,
      ...params
    );
    console.log('COUNT:', countResult);
    
  } catch (e) {
    console.error('ERROR:', e);
  } finally {
    await prisma.$disconnect();
  }
}
test();
