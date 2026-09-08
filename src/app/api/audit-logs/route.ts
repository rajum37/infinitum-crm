import { hasFeature } from "@/lib/subscription";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractTokenFromRequest, getTokenPayload, requireRole, requireAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const token = extractTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const payload = getTokenPayload(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const roleError = requireRole(payload.role, ["SUPER_ADMIN", "ADMIN"]);
    if (roleError) return roleError;

    const { searchParams } = new URL(request.url);
    const search    = searchParams.get("search") || "";
    const category  = searchParams.get("category") || "";
    const severity  = searchParams.get("severity") || "";
    const from      = searchParams.get("from") || "";
    const to        = searchParams.get("to") || "";
    const page      = searchParams.get("page") ? parseInt(searchParams.get("page") as string, 10) : 1;
    const limit     = searchParams.get("limit") ? parseInt(searchParams.get("limit") as string, 10) : 10;
    const offset    = (page - 1) * limit;

    let whereSql = `1=1`;
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      whereSql += ` AND (
        action ILIKE $${paramIndex} OR 
        metadata->>'actorName' ILIKE $${paramIndex} OR 
        metadata->>'actorEmail' ILIKE $${paramIndex} OR 
        metadata->>'summary' ILIKE $${paramIndex} OR 
        metadata->>'targetName' ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (category) {
      whereSql += ` AND metadata->>'category' = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (severity) {
      whereSql += ` AND metadata->>'severity' = $${paramIndex}`;
      params.push(severity);
      paramIndex++;
    }

    const action = searchParams.get("action") || "";
    if (action) {
      whereSql += ` AND action = $${paramIndex}`;
      params.push(action);
      paramIndex++;
    }

    let allowedEmails: string[] | null = null;
    if (payload.role === "ADMIN") {
      const adminUser = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { companyId: true, company: true, department: true },
      });
      const adminCompId = adminUser?.companyId;
      const adminCompName = adminUser?.company || adminUser?.department;

      const orConditions: any[] = [{ createdBy: payload.userId }, { id: payload.userId }];
      if (adminCompId) orConditions.push({ companyId: adminCompId });
      if (adminCompName) {
        orConditions.push({ company: { equals: adminCompName, mode: "insensitive" } });
        orConditions.push({ department: { equals: adminCompName, mode: "insensitive" } });
      }

      const companyUsers = await prisma.user.findMany({
        where: { OR: orConditions },
        select: { email: true },
      });
      allowedEmails = companyUsers.map((u) => u.email);

      if (allowedEmails.length === 0) {
        whereSql += ` AND 1=0`;
      } else {
        whereSql += ` AND metadata->>'actorEmail' = ANY($${paramIndex}::text[])`;
        params.push(allowedEmails);
        paramIndex++;
      }
    }

    if (from) {
      whereSql += ` AND created_at >= $${paramIndex}`;
      params.push(new Date(from));
      paramIndex++;
    }

    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      whereSql += ` AND created_at <= $${paramIndex}`;
      params.push(toDate);
      paramIndex++;
    }

    const countResult = await prisma.$queryRawUnsafe<any[]>(
      `SELECT 
         COUNT(*) as total,
         SUM(CASE WHEN metadata->>'severity' = 'SUCCESS' THEN 1 ELSE 0 END) as success_count,
         SUM(CASE WHEN metadata->>'severity' = 'WARNING' THEN 1 ELSE 0 END) as warning_count,
         SUM(CASE WHEN metadata->>'severity' = 'DANGER' THEN 1 ELSE 0 END) as danger_count
       FROM audit_logs WHERE ${whereSql}`,
      ...params
    );
    const totalItems = Number(countResult[0].total);
    const successCount = Number(countResult[0].success_count || 0);
    const warningCount = Number(countResult[0].warning_count || 0);
    const dangerCount = Number(countResult[0].danger_count || 0);

    const idsResult = await prisma.$queryRawUnsafe<{id: string}[]>(
      `SELECT id FROM audit_logs WHERE ${whereSql} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      ...params,
      limit,
      offset
    );
    
    const ids = idsResult.map((r: any) => r.id);

    let logs: any[] = [];
    if (ids.length > 0) {
      logs = await prisma.auditLog.findMany({
        where: { id: { in: ids } },
        orderBy: { createdAt: "desc" },
      });
    }

    // Remap metadata fields to top level so UI doesn't break
    const finalLogs = logs.map(log => ({
      ...log,
      ...((log.metadata as any) || {})
    }));

    return NextResponse.json({
      data: finalLogs,
      total: totalItems,
      stats: {
        success: successCount,
        warning: warningCount,
        danger: dangerCount
      },
      page,
      limit
    });
  } catch (error: any) {
    console.error("GET /api/audit-logs error:", error);
    return NextResponse.json({ error: "Failed to fetch audit logs", details: error.message, stack: error.stack }, { status: 500 });
  }
}
