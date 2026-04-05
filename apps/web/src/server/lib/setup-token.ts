import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export function generateSetupToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function hashSetupToken(token: string): Promise<string> {
  return bcrypt.hash(token, 10);
}

export function getSetupTokenExpiry(): Date {
  return new Date(Date.now() + 24 * 60 * 60 * 1000);
}
