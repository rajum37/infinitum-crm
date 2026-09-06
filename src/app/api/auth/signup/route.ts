import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { generateToken, requireAuthenticatedUser } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, companyName, planCode, planPriceId } = body;

    if (!name || !email || !password || !companyName) {
      return NextResponse.json(
        { error: "Name, email, password, and company name are required" },
        { status: 400 }
      );
    }

    // 1. Validate plan if provided, or find default plan
    let plan = null;
    if (planCode) {
      plan = await prisma.plan.findUnique({ where: { code: planCode } });
      if (!plan) {
        return NextResponse.json({ error: "Invalid plan selected" }, { status: 400 });
      }
    } else {
      plan = await prisma.plan.findFirst({ where: { isDefault: true } });
      if (!plan) {
        // Fallback to first available plan if no default is set
        plan = await prisma.plan.findFirst();
      }
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Run atomic onboarding transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Company
      const company = await tx.company.create({
        data: {
          name: companyName.trim(),
          status: "ACTIVE",
          isActive: true,
          isDeleted: false,
        },
      });

      // 2. Create Initial ADMIN User
      const user = await tx.user.create({
        data: {
          email: email.trim(),
          name: name.trim(),
          passwordHash,
          role: "ADMIN", // Owner role is implicitly Admin
          companyId: company.id,
          company: company.name, // Keep legacy field synced for now
          status: "ACTIVE",
          isActive: true,
        },
      });

      // 3. Set Company Owner
      const updatedCompany = await tx.company.update({
        where: { id: company.id },
        data: { ownerUserId: user.id },
      });

      // Resolve the correct plan price
      let price = null;
      if (plan) {
        if (planPriceId) {
          price = await tx.planPrice.findFirst({
            where: { id: planPriceId, planId: plan.id }
          });
        }
        if (!price) {
          price = await tx.planPrice.findFirst({
            where: { planId: plan.id, isDefault: true }
          });
        }
        if (!price) {
          price = await tx.planPrice.findFirst({
            where: { planId: plan.id }
          });
        }
      }

      // 4. Create Subscription (if a plan exists)
      if (plan && price) {
        // Date arithmetic for strict calendar intervals
        const addCalendarInterval = (startDate: Date, interval: string, count: number): Date => {
          const date = new Date(startDate);
          const currentDay = date.getDate();
          switch (interval) {
            case "MONTH":
              date.setMonth(date.getMonth() + count);
              break;
            case "QUARTER":
              date.setMonth(date.getMonth() + count * 3);
              break;
            case "HALF_YEAR":
              date.setMonth(date.getMonth() + count * 6);
              break;
            case "YEAR":
              date.setFullYear(date.getFullYear() + count);
              break;
            case "WEEK":
              date.setDate(date.getDate() + count * 7);
              return date;
            case "DAY":
              date.setDate(date.getDate() + count);
              return date;
          }
          if (date.getDate() !== currentDay && ["MONTH", "QUARTER", "HALF_YEAR", "YEAR"].includes(interval)) {
            date.setDate(0);
          }
          return date;
        };

        const now = new Date();
        const trailingDays = price.trailingDays || 0;
        
        let trialStartsAt = now;
        let trialEndsAt = new Date(now);
        if (trailingDays > 0) {
          trialEndsAt.setDate(trialEndsAt.getDate() + trailingDays);
        }

        const currentPeriodStart = new Date(trialEndsAt);
        const currentPeriodEnd = addCalendarInterval(currentPeriodStart, price.billingInterval, price.intervalCount);

        await tx.subscription.create({
          data: {
            companyId: company.id,
            planId: plan.id,
            planPriceId: price.id,
            billingInterval: price.billingInterval,
            status: trailingDays > 0 ? "TRIALING" : "ACTIVE",
            currency: price.currency,
            amount: price.amount,
            startedAt: now,
            trial_starts_at: trialStartsAt,
            trialEndsAt: trialEndsAt,
            currentPeriodStart: currentPeriodStart,
            currentPeriodEnd: currentPeriodEnd,
          },
        });
      } else if (plan) {
        // Fallback for plans without prices
        await tx.subscription.create({
          data: {
            companyId: company.id,
            planId: plan.id,
            status: "TRIALING",
            currency: plan.currency || "USD",
            amount: 0,
          },
        });
      }

      // 5. Log Audit Event
      await tx.auditLog.create({
        data: {
          user_id: user.id,
          action: "COMPANY_ONBOARDED",
          entity: "Company",
          entity_id: company.id,
          metadata: { planCode: plan?.code, planPriceId: price?.id },
          createdAt: new Date(),
        }
      });

      return { company: updatedCompany, user };
    });

    // Generate JWT token so user can log in immediately
    const token = generateToken({
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role,
      name: result.user.name,
      companyId: result.user.companyId || undefined,
    });

    return NextResponse.json(
      {
        message: "Organization created successfully",
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role,
        },
        company: {
          id: result.company.id,
          name: result.company.name,
        },
        token,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST /api/auth/signup error:", error);

    // Handle Prisma unique constraint violations (e.g. duplicate company name)
    if (error.code === 'P2002') {
      const target = error.meta?.target;
      if (Array.isArray(target) && target.includes('name')) {
        return NextResponse.json({ error: "A company with this name already exists" }, { status: 400 });
      }
      if (Array.isArray(target) && target.includes('email')) {
        return NextResponse.json({ error: "A user with this email already exists" }, { status: 400 });
      }
      return NextResponse.json({ error: "A record with this information already exists" }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Failed to process signup" },
      { status: 500 }
    );
  }
}
