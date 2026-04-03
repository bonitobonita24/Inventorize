// Types — @inventorize/shared/types
// All interfaces derive from docs/PRODUCT.md Data Entities section

import type {
  UserRole,
  TenantStatus,
  POStatus,
  SerialNumberStatus,
  MovementType,
  NotificationStatus,
  AdjustmentReason,
} from '../enums/index.js';

// ─── Platform-level entities (no tenantId) ───────────────────

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  contactEmail: string;
  status: TenantStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  tenantId: string | null;
  name: string;
  email: string;
  hashedPassword: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface VerificationToken {
  identifier: string;
  token: string;
  expires: Date;
}

// ─── Tenant-scoped entities ──────────────────────────────────

export interface Product {
  id: string;
  tenantId: string;
  productCode: string;
  barcodeValue: string;
  name: string;
  category: string;
  unit: string;
  supplierCost: number;
  markupPercent: number;
  sellingPrice: number;
  currentQuantity: number;
  lowStockThreshold: number;
  serialTrackingEnabled: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Supplier {
  id: string;
  tenantId: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PurchaseOrder {
  id: string;
  tenantId: string;
  poNumber: string;
  supplierId: string;
  orderDate: Date;
  expectedDate: Date | null;
  status: POStatus;
  notes: string | null;
  attachmentUrl: string | null;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PurchaseOrderItem {
  id: string;
  purchaseOrderId: string;
  productId: string;
  orderedQty: number;
  receivedQty: number;
  supplierCostSnapshot: number;
}

export interface StockIn {
  id: string;
  tenantId: string;
  referenceNumber: string;
  purchaseOrderId: string | null;
  receivedDate: Date;
  receivedByUserId: string;
  notes: string | null;
  attachmentUrl: string | null;
  createdAt: Date;
}

export interface StockInItem {
  id: string;
  stockInId: string;
  productId: string;
  quantity: number;
  supplierCostSnapshot: number;
}

export interface StockOut {
  id: string;
  tenantId: string;
  referenceNumber: string;
  releasedDate: Date;
  releasedByUserId: string;
  requestedByName: string;
  usedFor: string;
  notes: string | null;
  printableSlipNumber: string;
  createdAt: Date;
}

export interface StockOutItem {
  id: string;
  stockOutId: string;
  productId: string;
  quantity: number;
  sellingPriceSnapshot: number;
}

export interface SerialNumber {
  id: string;
  tenantId: string;
  productId: string;
  serialValue: string;
  barcodeValue: string | null;
  status: SerialNumberStatus;
  stockInItemId: string | null;
  stockOutItemId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StockAdjustment {
  id: string;
  tenantId: string;
  adjustmentDate: Date;
  reason: AdjustmentReason;
  notes: string | null;
  createdByUserId: string;
  approvedByUserId: string | null;
  createdAt: Date;
}

export interface StockAdjustmentItem {
  id: string;
  stockAdjustmentId: string;
  productId: string;
  quantityDelta: number;
  serialNumberId: string | null;
}

export interface StockMovementLog {
  id: string;
  tenantId: string;
  productId: string;
  movementType: MovementType;
  referenceType: string;
  referenceId: string;
  quantityBefore: number;
  quantityDelta: number;
  quantityAfter: number;
  serialNumberId: string | null;
  performedByUserId: string;
  requestedByName: string | null;
  usedFor: string | null;
  performedAt: Date;
  notes: string | null;
}

export interface AuditLog {
  id: string;
  tenantId: string | null;
  actorUserId: string;
  actionType: string;
  entityType: string;
  entityId: string;
  fieldChangesJson: unknown;
  beforeStateJson: unknown;
  afterStateJson: unknown;
  createdAt: Date;
}

export interface LowStockNotificationLog {
  id: string;
  tenantId: string;
  productId: string;
  notifiedToUserId: string;
  sentAt: Date;
  status: NotificationStatus;
}

// ─── Session type ────────────────────────────────────────────

export interface AppSession {
  userId: string;
  tenantId: string | null;
  roles: UserRole[];
  name: string;
  email: string;
  isImpersonating: boolean;
  impersonatedTenantId?: string | undefined;
  impersonatedTenantName?: string | undefined;
}

// ─── Pagination ──────────────────────────────────────────────

export interface PaginationInput {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
