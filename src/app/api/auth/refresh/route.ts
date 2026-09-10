import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateAccessToken, generateRefreshToken, verifyToken } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const cookieHeader = request.headers.get("cookie");
    let currentRefreshToken = null;
    
    if (cookieHeader) {
      const cookies = Object.fromEntries(
        cookieHeader.split("; ").map(c => {
          const [k, v] = c.split("=");
          return [k, decodeURIComponent(v)];
        })
      );
      currentRefreshToken = cookies["nexus-refresh-token"];
    }

    if (!currentRefreshToken) {
      return NextResponse.json({ error: "No refresh token provided" }, { status: 401 });
    }

    // Verify RT JWT signature
    let payload;
    try {
      payload = verifyToken(currentRefreshToken);
    } catch {
      return NextResponse.json({ error: "Invalid refresh token" }, { status: 401 });
    }

    if (!payload || !payload.userId) {
      return NextResponse.json({ error: "Invalid refresh token payload" }, { status: 401 });
    }

    // Verify user and company active status
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { companyRef: true },
    });

    if (!user || user.status === "INACTIVE" || !user.isActive) {
      return NextResponse.json({ error: "User deactivated" }, { status: 401 });
    }

    if (user.role !== "SUPER_ADMIN") {
      const compId = user.companyId || user.companyRef?.id;
      const compName = user.company || user.department;
      
      let isCompDeactivated = false;
      if (user.companyRef) {
        if (!user.companyRef.isActive || user.companyRef.status === "INACTIVE") {
          isCompDeactivated = true;
        }
      } else if (compId || compName) {
        const company = await prisma.company.findFirst({
          where: {
            OR: [
              compId ? { id: compId } : undefined,
              compName ? { name: { equals: compName, mode: "insensitive" } } : undefined,
            ].filter(Boolean) as any,
          },
        });
        if (company && (!company.isActive || company.status === "INACTIVE")) {
          isCompDeactivated = true;
        }
      }
      
      if (isCompDeactivated) {
        return NextResponse.json({ error: "Company deactivated" }, { status: 401 });
      }
    }

    // Check sessions to find matching hash
    const activeSessions = await prisma.session.findMany({
      where: {
        userId: user.id,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    let matchedSession = null;
    for (const session of activeSessions) {
      const isMatch = await bcrypt.compare(currentRefreshToken, session.refreshTokenHash);
      if (isMatch) {
        matchedSession = session;
        break;
      }
    }

    if (!matchedSession) {
      // Possible token reuse, could revoke all sessions here
      await prisma.session.updateMany({
        where: { userId: user.id },
        data: { revokedAt: new Date() }
      });
      return NextResponse.json({ error: "Session invalid or revoked" }, { status: 401 });
    }

    // Absolute timeout enforcement (e.g. 24 hours max)
    const MAX_SESSION_DURATION_MS = 24 * 60 * 60 * 1000;
    if (Date.now() - matchedSession.createdAt.getTime() > MAX_SESSION_DURATION_MS) {
      await prisma.session.update({
        where: { id: matchedSession.id },
        data: { revokedAt: new Date() }
      });
      return NextResponse.json({ error: "Absolute session timeout reached" }, { status: 401 });
    }

    // Rotate tokens
    const newPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name || user.email,
    };
    
    // Check permissions dynamically for AT
    let rolePermissions = {};
    if (user.role) {
      const { getDefaultPermissionsForRole, mergePermissionsForRole } = await import("@/lib/permissions");
      rolePermissions = getDefaultPermissionsForRole(user.role);
      try {
        const config = await prisma.systemConfig.findUnique({ where: { key: "ROLE_PERMISSIONS" } });
        const dbPerms = config ? JSON.parse(config.value as string) : null;
        rolePermissions = mergePermissionsForRole(user.role, dbPerms);
      } catch (err) { }
    }
    
    const newAccessToken = generateAccessToken({ ...newPayload, permissions: rolePermissions });
    const newRefreshToken = generateRefreshToken(newPayload);
    const newRefreshTokenHash = await bcrypt.hash(newRefreshToken, 10);

    // Update session with new hash
    await prisma.session.update({
      where: { id: matchedSession.id },
      data: { refreshTokenHash: newRefreshTokenHash },
    });

    const response = NextResponse.json({ success: true });

    response.cookies.set("nexus-access-token", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60, // 15 mins
      path: "/",
    });

    response.cookies.set("nexus-refresh-token", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Refresh error:", error);
    return NextResponse.json({ error: "Refresh failed" }, { status: 500 });
  }
}
