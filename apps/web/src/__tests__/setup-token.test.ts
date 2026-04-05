// Tests for setup token generation and validation logic (Batch 12)
// RED: these import functions that don't exist yet

import { describe, it, expect } from 'vitest';
import { generateSetupToken, hashSetupToken, getSetupTokenExpiry } from '@/server/lib/setup-token';

describe('setup token', () => {
  it('generateSetupToken returns a non-empty string', () => {
    const token = generateSetupToken();
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(20);
  });

  it('hashSetupToken returns a different value from the original', async () => {
    const token = generateSetupToken();
    const hashed = await hashSetupToken(token);
    expect(hashed).not.toBe(token);
    expect(hashed.length).toBeGreaterThan(20);
  });

  it('getSetupTokenExpiry returns a date 24 hours in the future', () => {
    const expiry = getSetupTokenExpiry();
    const now = Date.now();
    const diffMs = expiry.getTime() - now;
    // Should be between 23h55m and 24h05m from now
    expect(diffMs).toBeGreaterThan(23 * 60 * 60 * 1000);
    expect(diffMs).toBeLessThan(25 * 60 * 60 * 1000);
  });
});
