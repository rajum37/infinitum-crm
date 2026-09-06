import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractTokenFromRequest, getTokenPayload, requireRole, requireAuthenticatedUser } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if (auth instanceof Response) return auth;
    const { payload, user: authUser } = auth;
    
    const roleError = requireRole(payload.role, ["SUPER_ADMIN"]);
    if (roleError) return roleError;

    const feature = await prisma.feature.findUnique({
      where: { id: params.id }
    });

    if (!feature) return NextResponse.json({ error: "Feature not found" }, { status: 404 });

    return NextResponse.json(feature);
  } catch (error) {
    console.error("GET /api/admin/features/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch feature" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if (auth instanceof Response) return auth;
    const { payload, user: authUser } = auth;
    
    const roleError = requireRole(payload.role, ["SUPER_ADMIN"]);
    if (roleError) return roleError;

    const existingFeature = await prisma.feature.findUnique({ where: { id: params.id } });
    if (!existingFeature) return NextResponse.json({ error: "Feature not found" }, { status: 404 });

    const body = await request.json();
    const { name, description, status, module, resource, action, isMetered, isVisible, configurationSchema } = body;

    // Notice we do NOT allow editing `code` or `featureType` to preserve stability.

    const feature = await prisma.feature.update({
      where: { id: params.id },
      data: {
        name: name !== undefined ? name : existingFeature.name,
        description: description !== undefined ? description : existingFeature.description,
        status: status !== undefined ? status : existingFeature.status,
        module: module !== undefined ? module : existingFeature.module,
        resource: resource !== undefined ? resource : existingFeature.resource,
        action: action !== undefined ? action : existingFeature.action,
        isMetered: isMetered !== undefined ? isMetered : existingFeature.isMetered,
        isVisible: isVisible !== undefined ? isVisible : existingFeature.isVisible,
        configurationSchema: configurationSchema !== undefined ? configurationSchema : existingFeature.configurationSchema,
      },
    });

    await logAuditEvent({
      action: "FEATURE_UPDATED",
      category: "Platform Management",
      severity: "INFO",
      actorName: payload.name || payload.email,
      actorEmail: payload.email,
      actorRole: payload.role,
      targetName: feature.name,
      summary: `Updated platform feature: ${feature.code}`,
    });

    return NextResponse.json(feature);
  } catch (error: any) {
    console.error("PATCH /api/admin/features/[id] error:", error);
    return NextResponse.json({ error: error?.message || "Failed to update feature" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if (auth instanceof Response) return auth;
    const { payload, user: authUser } = auth;
    
    const roleError = requireRole(payload.role, ["SUPER_ADMIN"]);
    if (roleError) return roleError;

    const existingFeature = await prisma.feature.findUnique({ where: { id: params.id } });
    if (!existingFeature) return NextResponse.json({ error: "Feature not found" }, { status: 404 });

    // Safe deletion: Archive the feature instead of hard deleting it.
    const feature = await prisma.feature.update({
      where: { id: params.id },
      data: {
        status: "INACTIVE",
        isVisible: false
      }
    });

    await logAuditEvent({
      action: "FEATURE_DISABLED",
      category: "Platform Management",
      severity: "WARNING",
      actorName: payload.name || payload.email,
      actorEmail: payload.email,
      actorRole: payload.role,
      targetName: feature.name,
      summary: `Disabled platform feature: ${feature.code}`,
    });

    return NextResponse.json(feature);
  } catch (error: any) {
    console.error("DELETE /api/admin/features/[id] error:", error);
    return NextResponse.json({ error: error?.message || "Failed to delete feature" }, { status: 500 });
  }
}
