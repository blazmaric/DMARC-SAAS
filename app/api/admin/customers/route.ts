import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { z } from 'zod';

const createCustomerSchema = z.object({
  name: z.string().min(1),
});

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const supabase = await createClient();

    const { data: customers, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch customers' },
        { status: 500 }
      );
    }

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

    const supabase = await createClient();

    const { data: customer, error } = await supabase
      .from('customers')
      .insert({ name })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to create customer' },
        { status: 500 }
      );
    }

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
