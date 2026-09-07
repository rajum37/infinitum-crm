import { NextResponse } from 'next/server';
import { BillingInterval } from '@prisma/client';
import { requireAuthenticatedUser } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if (auth instanceof Response) return auth;

    // Return the Prisma enum values
    const intervals = Object.values(BillingInterval);

    return NextResponse.json({ success: true, data: intervals });
  } catch (error: any) {
    console.error('Error fetching billing intervals:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch billing intervals' }, { status: 500 });
  }
}
