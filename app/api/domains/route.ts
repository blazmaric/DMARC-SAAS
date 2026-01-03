import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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

    const supabase = await createClient();

    let query = supabase
      .from('domains')
      .select('*, customer:customers(*)');

    if (user.role === 'customer' && user.customer_id) {
      query = query.eq('customer_id', user.customer_id);
    }

    const { data: domains, error } = await query.order('created_at', {
      ascending: false,
    });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch domains' },
        { status: 500 }
      );
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
      targetCustomerId = user.customer_id;
    }

    if (!targetCustomerId) {
      return NextResponse.json(
        { error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const ruaToken = generateSecureToken(24);

    const { data: domain, error } = await supabase
      .from('domains')
      .insert({
        domain_name: domainName,
        customer_id: targetCustomerId,
        rua_token: ruaToken,
      })
      .select('*, customer:customers(*)')
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to create domain' },
        { status: 500 }
      );
    }

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
