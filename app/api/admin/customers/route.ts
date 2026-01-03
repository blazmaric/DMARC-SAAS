import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { z } from 'zod';

const createCustomerSchema = z.object({
  name: z.string().min(1),
});

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const customers = await prisma.customer.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ customers });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Unauthorized' },
      { status: 401 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { name } = createCustomerSchema.parse(body);

    const customer = await prisma.customer.create({
      data: { name },
    });

    return NextResponse.json({ customer });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Unauthorized' },
      { status: 401 }
    );
  }
}
