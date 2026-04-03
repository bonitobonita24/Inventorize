// Enums — @inventorize/shared/enums
// All enum values derive from docs/PRODUCT.md Data Entities section

export const UserRole = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  WAREHOUSE_STAFF: 'warehouse_staff',
  PURCHASING_STAFF: 'purchasing_staff',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const TenantStatus = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  TRIAL: 'trial',
} as const;
export type TenantStatus = (typeof TenantStatus)[keyof typeof TenantStatus];

export const POStatus = {
  DRAFT: 'draft',
  ORDERED: 'ordered',
  PARTIALLY_RECEIVED: 'partially_received',
  RECEIVED: 'received',
  CANCELLED: 'cancelled',
} as const;
export type POStatus = (typeof POStatus)[keyof typeof POStatus];

export const SerialNumberStatus = {
  IN_STOCK: 'in_stock',
  ISSUED: 'issued',
  ADJUSTED: 'adjusted',
} as const;
export type SerialNumberStatus = (typeof SerialNumberStatus)[keyof typeof SerialNumberStatus];

export const MovementType = {
  STOCK_IN: 'stock_in',
  STOCK_OUT: 'stock_out',
  ADJUSTMENT: 'adjustment',
} as const;
export type MovementType = (typeof MovementType)[keyof typeof MovementType];

export const NotificationStatus = {
  SENT: 'sent',
  FAILED: 'failed',
  RETRIED: 'retried',
} as const;
export type NotificationStatus = (typeof NotificationStatus)[keyof typeof NotificationStatus];

export const AdjustmentReason = {
  RECOUNT: 'recount',
  DAMAGE: 'damage',
  THEFT: 'theft',
  CORRECTION: 'correction',
  OTHER: 'other',
} as const;
export type AdjustmentReason = (typeof AdjustmentReason)[keyof typeof AdjustmentReason];
