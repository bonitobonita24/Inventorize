// Tests for role-based pricing visibility logic (Batch 12)
// RED: these import helpers that don't exist yet

import { describe, it, expect } from 'vitest';
import { pricingSelectForRole } from '@/server/lib/pricing-select';
import { UserRole } from '@inventorize/shared/enums';

describe('pricingSelectForRole', () => {
  it('returns supplierCost and markupPercent for admin', () => {
    const select = pricingSelectForRole(UserRole.ADMIN);
    expect(select).toMatchObject({ supplierCost: true, markupPercent: true, sellingPrice: true });
  });

  it('returns supplierCost and markupPercent for purchasing_staff', () => {
    const select = pricingSelectForRole(UserRole.PURCHASING_STAFF);
    expect(select).toMatchObject({ supplierCost: true, markupPercent: true, sellingPrice: true });
  });

  it('returns only sellingPrice for warehouse_staff', () => {
    const select = pricingSelectForRole(UserRole.WAREHOUSE_STAFF);
    expect(select).toMatchObject({ sellingPrice: true });
    expect(select).not.toHaveProperty('supplierCost');
    expect(select).not.toHaveProperty('markupPercent');
  });
});
