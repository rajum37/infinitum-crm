import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractTokenFromRequest, getTokenPayload, requireRole, requireAuthenticatedUser } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";

export async function GET(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if (auth instanceof Response) return auth;
    const { payload, user: authUser } = auth;
    
    const roleError = requireRole(payload.role, ["SUPER_ADMIN"]);
    if (roleError) return roleError;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    
    const where: any = {};
    if (status && status !== "ALL") {
      where.status = status;
    }

    const features = await prisma.feature.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(features);
  } catch (error) {
    console.error("GET /api/admin/features error:", error);
    return NextResponse.json({ error: "Failed to fetch features" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if (auth instanceof Response) return auth;
    const { payload, user: authUser } = auth;
    
    const roleError = requireRole(payload.role, ["SUPER_ADMIN"]);
    if (roleError) return roleError;

    const body = await request.json();
    const { code, name, description, featureType, module, resource, action, isMetered, isSystem, isVisible, configurationSchema } = body;

    if (!code || !name || !featureType) {
      return NextResponse.json({ error: "Code, name, and featureType are required" }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase().replace(/\s+/g, "_");
    const existingFeature = await prisma.feature.findUnique({ where: { code: cleanCode } });
    if (existingFeature) {
      return NextResponse.json({ error: "Feature code already exists" }, { status: 409 });
    }

    const feature = await prisma.feature.create({
      data: {
        code: cleanCode,
        name,
        description,
        featureType,
        status: "ACTIVE",
        module,
        resource,
        action,
        isMetered: isMetered || false,
        isSystem: isSystem || false,
        isVisible: isVisible !== undefined ? isVisible : true,
        configurationSchema,
      },
    });

    await logAuditEvent({
      action: "FEATURE_CREATED",
      category: "Platform Management",
      severity: "SUCCESS",
      actorName: payload.name || payload.email,
      actorEmail: payload.email,
      actorRole: payload.role,
      targetName: feature.name,
      summary: `Created platform feature: ${feature.code}`,
    });

    return NextResponse.json(feature, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/admin/features error:", error);
    return NextResponse.json({ error: error?.message || "Failed to create feature" }, { status: 500 });
  }
}
