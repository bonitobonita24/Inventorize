// Zod Schemas — @inventorize/shared/schemas
// Validation schemas for all entities — used by tRPC input validation
// All schemas derive from docs/PRODUCT.md Data Entities section

import { z } from 'zod';

// ─── Enum schemas ────────────────────────────────────────────

export const userRoleSchema = z.enum([
  'super_admin',
  'admin',
  'warehouse_staff',
  'purchasing_staff',
]);

export const tenantStatusSchema = z.enum(['active', 'suspended', 'trial']);

export const poStatusSchema = z.enum([
  'draft',
  'ordered',
  'partially_received',
  'received',
  'cancelled',
]);

export const serialNumberStatusSchema = z.enum(['in_stock', 'issued', 'adjusted']);

export const movementTypeSchema = z.enum(['stock_in', 'stock_out', 'adjustment']);

export const notificationStatusSchema = z.enum(['sent', 'failed', 'retried']);

export const adjustmentReasonSchema = z.enum([
  'recount',
  'damage',
  'theft',
  'correction',
  'other',
]);

// ─── Pagination ──────────────────────────────────────────────

export const paginationInputSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(200).default(50),
});

// ─── Tenant schemas ──────────────────────────────────────────

export const createTenantSchema = z
  .object({
    name: z.string().min(1).max(100).trim(),
    slug: z
      .string()
      .min(1)
      .max(100)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens'),
    contactEmail: z.string().email().max(255),
  })
  .strict();

export const updateTenantStatusSchema = z
  .object({
    id: z.string().cuid(),
    status: tenantStatusSchema,
  })
  .strict();

// ─── User schemas ────────────────────────────────────────────

export const createUserSchema = z
  .object({
    tenantId: z.string().cuid(),
    name: z.string().min(1).max(100).trim(),
    email: z.string().email().max(255),
    role: userRoleSchema.exclude(['super_admin']),
  })
  .strict();

export const updateUserSchema = z
  .object({
    id: z.string().cuid(),
    name: z.string().min(1).max(100).trim().optional(),
    role: userRoleSchema.exclude(['super_admin']).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.string().email().max(255),
    password: z.string().min(1).max(128),
  })
  .strict();

export const setupPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(8).max(128),
  })
  .strict();

// ─── Product schemas ─────────────────────────────────────────

export const createProductSchema = z
  .object({
    productCode: z.string().min(1).max(50).trim(),
    barcodeValue: z.string().min(1).max(100).trim(),
    name: z.string().min(1).max(200).trim(),
    category: z.string().min(1).max(100).trim(),
    unit: z.string().min(1).max(50).trim(),
    supplierCost: z.number().nonnegative(),
    markupPercent: z.number().nonnegative().max(10000),
    lowStockThreshold: z.number().int().nonnegative(),
    serialTrackingEnabled: z.boolean().default(false),
  })
  .strict();

export const updateProductSchema = z
  .object({
    id: z.string().cuid(),
    productCode: z.string().min(1).max(50).trim().optional(),
    barcodeValue: z.string().min(1).max(100).trim().optional(),
    name: z.string().min(1).max(200).trim().optional(),
    category: z.string().min(1).max(100).trim().optional(),
    unit: z.string().min(1).max(50).trim().optional(),
    supplierCost: z.number().nonnegative().optional(),
    markupPercent: z.number().nonnegative().max(10000).optional(),
    lowStockThreshold: z.number().int().nonnegative().optional(),
    serialTrackingEnabled: z.boolean().optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

// ─── Supplier schemas ────────────────────────────────────────

export const createSupplierSchema = z
  .object({
    name: z.string().min(1).max(200).trim(),
    contactPerson: z.string().max(100).trim().optional(),
    phone: z.string().max(50).trim().optional(),
    email: z.string().email().max(255).optional(),
    address: z.string().max(500).trim().optional(),
    notes: z.string().max(1000).trim().optional(),
  })
  .strict();

export const updateSupplierSchema = z
  .object({
    id: z.string().cuid(),
    name: z.string().min(1).max(200).trim().optional(),
    contactPerson: z.string().max(100).trim().optional(),
    phone: z.string().max(50).trim().optional(),
    email: z.string().email().max(255).optional(),
    address: z.string().max(500).trim().optional(),
    notes: z.string().max(1000).trim().optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

// ─── Purchase Order schemas ──────────────────────────────────

export const createPurchaseOrderSchema = z
  .object({
    supplierId: z.string().cuid(),
    orderDate: z.coerce.date(),
    expectedDate: z.coerce.date().optional(),
    notes: z.string().max(1000).trim().optional(),
    items: z
      .array(
        z
          .object({
            productId: z.string().cuid(),
            orderedQty: z.number().int().positive(),
            supplierCostSnapshot: z.number().nonnegative(),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

export const updatePOStatusSchema = z
  .object({
    id: z.string().cuid(),
    status: poStatusSchema,
  })
  .strict();

// ─── Stock In schemas ────────────────────────────────────────

export const createStockInSchema = z
  .object({
    purchaseOrderId: z.string().cuid().optional(),
    receivedDate: z.coerce.date(),
    notes: z.string().max(1000).trim().optional(),
    items: z
      .array(
        z
          .object({
            productId: z.string().cuid(),
            quantity: z.number().int().positive(),
            supplierCostSnapshot: z.number().nonnegative(),
            serialNumbers: z.array(z.string().min(1).max(100).trim()).optional(),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

// ─── Stock Out schemas ───────────────────────────────────────

export const createStockOutSchema = z
  .object({
    releasedDate: z.coerce.date(),
    requestedByName: z.string().min(1).max(200).trim(),
    usedFor: z.string().min(1).max(500).trim(),
    notes: z.string().max(1000).trim().optional(),
    items: z
      .array(
        z
          .object({
            productId: z.string().cuid(),
            quantity: z.number().int().positive(),
            sellingPriceSnapshot: z.number().nonnegative(),
            serialNumberIds: z.array(z.string().cuid()).optional(),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

// ─── Stock Adjustment schemas ────────────────────────────────

export const createStockAdjustmentSchema = z
  .object({
    adjustmentDate: z.coerce.date(),
    reason: adjustmentReasonSchema,
    notes: z.string().max(1000).trim().optional(),
    approvedByUserId: z.string().cuid().optional(),
    items: z
      .array(
        z
          .object({
            productId: z.string().cuid(),
            quantityDelta: z.number().int(),
            serialNumberId: z.string().cuid().optional(),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

// ─── Filter / query schemas ─────────────────────────────────

export const productFilterSchema = z
  .object({
    search: z.string().max(200).optional(),
    category: z.string().max(100).optional(),
    isActive: z.boolean().optional(),
    lowStockOnly: z.boolean().optional(),
  })
  .strict()
  .merge(paginationInputSchema);

export const stockMovementFilterSchema = z
  .object({
    productId: z.string().cuid().optional(),
    movementType: movementTypeSchema.optional(),
    performedByUserId: z.string().cuid().optional(),
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
  })
  .strict()
  .merge(paginationInputSchema);

export const auditLogFilterSchema = z
  .object({
    actionType: z.string().max(100).optional(),
    entityType: z.string().max(100).optional(),
    actorUserId: z.string().cuid().optional(),
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
  })
  .strict()
  .merge(paginationInputSchema);

export const purchaseOrderFilterSchema = z
  .object({
    status: poStatusSchema.optional(),
    supplierId: z.string().cuid().optional(),
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
  })
  .strict()
  .merge(paginationInputSchema);

export const supplierFilterSchema = z
  .object({
    search: z.string().max(200).optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .merge(paginationInputSchema);

// ─── Report export schema ────────────────────────────────────

export const reportExportSchema = z
  .object({
    reportType: z.enum([
      'low_stock',
      'stock_movement',
      'current_inventory',
      'product_history',
      'audit_trail',
    ]),
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
    productId: z.string().cuid().optional(),
  })
  .strict();

// ─── Slug validation ─────────────────────────────────────────

export const checkSlugSchema = z
  .object({
    slug: z
      .string()
      .min(1)
      .max(100)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  })
  .strict();

// ─── ID param schema (reusable) ─────────────────────────────

export const idParamSchema = z
  .object({
    id: z.string().cuid(),
  })
  .strict();
