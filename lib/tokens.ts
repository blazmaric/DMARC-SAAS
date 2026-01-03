import crypto from 'crypto';

export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex').substring(0, length);
}

export function extractTokenFromEmail(toAddress: string): string | null {
  const match = toAddress.match(/^([^@+]+)/);
  return match ? match[1] : null;
}
