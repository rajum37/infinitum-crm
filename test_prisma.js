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

    const countResult = await prisma.$queryRawUnsafe(
      `SELECT 
         COUNT(*) as total,
         SUM(CASE WHEN metadata->>'severity' = 'SUCCESS' THEN 1 ELSE 0 END) as success_count,
         SUM(CASE WHEN metadata->>'severity' = 'WARNING' THEN 1 ELSE 0 END) as warning_count,
         SUM(CASE WHEN metadata->>'severity' = 'DANGER' THEN 1 ELSE 0 END) as danger_count
       FROM audit_logs WHERE ${whereSql}`,
      ...params
    );
    console.log('COUNT:', countResult);
    
    const idsResult = await prisma.$queryRawUnsafe(
      `SELECT id FROM audit_logs WHERE ${whereSql} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      ...params,
      limit,
      offset
    );
    console.log('IDS:', idsResult);
  } catch (e) {
    console.error('ERROR:', e);
  } finally {
    await prisma.$disconnect();
  }
}
test();
