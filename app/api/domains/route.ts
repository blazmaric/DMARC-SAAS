import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { generateSecureToken } from '@/lib/tokens';
import { z } from 'zod';

const createDomainSchema = z.object({
  domainName: z.string().min(1),
  customerId: z.string().uuid().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let domains;
    if (user.role === 'customer' && user.customerId) {
      domains = await prisma.domain.findMany({
        where: { customerId: user.customerId },
        include: { customer: true },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      domains = await prisma.domain.findMany({
        include: { customer: true },
        orderBy: { createdAt: 'desc' },
      });
    }

    return NextResponse.json({ domains });
  } catch (error) {
    console.error('Domains fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { domainName, customerId } = createDomainSchema.parse(body);

    let targetCustomerId = customerId;

    if (user.role === 'customer') {
      targetCustomerId = user.customerId || undefined;
    }

    if (!targetCustomerId) {
      return NextResponse.json(
        { error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    const ruaToken = generateSecureToken(24);

    const domain = await prisma.domain.create({
      data: {
        domainName,
        customerId: targetCustomerId,
        ruaToken,
      },
      include: { customer: true },
    });

    return NextResponse.json({ domain });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Domain creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
