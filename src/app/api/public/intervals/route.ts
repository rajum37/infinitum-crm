import { NextResponse } from 'next/server';
import { BillingInterval } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const intervals = Object.values(BillingInterval);
    return NextResponse.json({ success: true, data: intervals });
  } catch (error: any) {
    console.error('Error fetching public intervals:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch intervals' }, { status: 500 });
  }
}
