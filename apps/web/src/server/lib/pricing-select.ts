import { UserRole } from '@inventorize/shared/enums';

type PricingSelect = {
  sellingPrice: true;
  supplierCost?: true;
  markupPercent?: true;
};

export function pricingSelectForRole(role: UserRole): PricingSelect {
  const canSeeCost =
    role === UserRole.ADMIN ||
    role === UserRole.SUPER_ADMIN ||
    role === UserRole.PURCHASING_STAFF;

  if (canSeeCost) {
    return { sellingPrice: true, supplierCost: true, markupPercent: true };
  }

  return { sellingPrice: true };
}
