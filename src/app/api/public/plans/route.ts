import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const plans = await prisma.plan.findMany({
      where: {
        status: "ACTIVE",
        isPublic: true,
      },
      orderBy: { basePrice: "asc" },
      include: {
        prices: {
          where: { isActive: true },
          orderBy: { amount: "asc" }
        },
        features: {
          include: {
            feature: true,
          },
        },
      },
    });

    return NextResponse.json(plans);
  } catch (error) {
    console.error("GET /api/public/plans error:", error);
    return NextResponse.json(
      { error: "Failed to fetch public plans" },
      { status: 500 }
    );
  }
}
