// packages/db — Prisma client singleton with tenant context
// Re-exports PrismaClient and all generated types.

import { PrismaClient } from '@prisma/client';
import { tenantGuardExtension } from './middleware/tenant-guard';

// Re-export tenant context utilities (defined in context.ts to avoid circular deps)
export {
  withTenantContext,
  getTenantContext,
  currentTenantId,
  currentUserId,
} from './context';
export type { TenantContext } from './context';

// ─── Prisma client singleton ─────────────────────────────────

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
  platformPrisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const client = new PrismaClient({
    log:
      process.env['NODE_ENV'] === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });
  return client.$extends(tenantGuardExtension);
}

/**
 * Tenant-scoped Prisma client (L6 guard active).
 * All queries automatically include tenantId from AsyncLocalStorage context.
 */
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env['NODE_ENV'] !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Platform-level Prisma client WITHOUT tenant guard (for superadmin operations).
 * Use ONLY in platform-level routers. Never in tenant-scoped resolvers.
 * All operations logged with "PLATFORM:" prefix in AuditLog.
 */
export const platformPrisma =
  globalForPrisma.platformPrisma ??
  new PrismaClient({
    log:
      process.env['NODE_ENV'] === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (process.env['NODE_ENV'] !== 'production') {
  globalForPrisma.platformPrisma = platformPrisma;
}

// ─── Re-exports ──────────────────────────────────────────────
export { PrismaClient, Prisma } from '@prisma/client';
export type {
  Tenant,
  User,
  VerificationToken,
  Product,
  Supplier,
  PurchaseOrder,
  PurchaseOrderItem,
  StockIn,
  StockInItem,
  StockOut,
  StockOutItem,
  SerialNumber,
  StockAdjustment,
  StockAdjustmentItem,
  StockMovementLog,
  AuditLog,
  LowStockNotificationLog,
  UserRole,
  TenantStatus,
  POStatus,
  SerialNumberStatus,
  MovementType,
  NotificationStatus,
  AdjustmentReason,
} from '@prisma/client';
