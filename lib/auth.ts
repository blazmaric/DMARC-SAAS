import { createClient } from '@/lib/supabase/server';
import bcrypt from 'bcryptjs';

export async function getCurrentUser() {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return null;
  }

  const { data: user } = await supabase
    .from('users')
    .select('*, customer:customers(*)')
    .eq('id', authUser.id)
    .maybeSingle();

  return user;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export async function requireAuth() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  return user;
}

export async function requireAdmin() {
  const user = await requireAuth();

  if (user.role !== 'admin') {
    throw new Error('Admin access required');
  }

  return user;
}
