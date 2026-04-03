// L2 — PostgreSQL RLS helper (active in multi-tenant mode)
// Sets the app.current_tenant_id session variable so RLS policies
// can filter rows at the database level — defence-in-depth alongside L6.

import { type PrismaClient, Prisma } from '@prisma/client';

/**
 * Execute a callback inside a Prisma transaction with RLS tenant context set.
 * Sets `app.current_tenant_id` via SET LOCAL (transaction-scoped, auto-resets).
 *
 * Use this for sensitive operations where L6 alone is not sufficient,
 * or when running raw SQL queries that bypass the Prisma extension.
 */
export async function withTenant<T>(
  prisma: PrismaClient,
  tenantId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    // SET LOCAL scopes the variable to THIS transaction only.
    // It auto-resets when the transaction completes — no cleanup needed.
    await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
    return fn(tx);
  });
}

/**
 * SQL fragments for enabling RLS on a table.
 * Used by migration scripts — not called at runtime.
 *
 * In multi-tenant mode, these are executed as active SQL.
 * In single-tenant mode, these are written as SQL comments for future upgrade.
 */
export const rlsStatements = {
  enable: (tableName: string) =>
    `ALTER TABLE "${tableName}" ENABLE ROW LEVEL SECURITY;`,

  createPolicy: (tableName: string) =>
    `CREATE POLICY tenant_isolation ON "${tableName}" USING (tenant_id = current_setting('app.current_tenant_id')::text);`,

  dropPolicy: (tableName: string) =>
    `DROP POLICY IF EXISTS tenant_isolation ON "${tableName}";`,

  disable: (tableName: string) =>
    `ALTER TABLE "${tableName}" DISABLE ROW LEVEL SECURITY;`,
} as const;

/**
 * List of tenant-scoped table names that need RLS policies.
 * Matches all models with a tenantId field in the Prisma schema.
 */
export const TENANT_SCOPED_TABLES = [
  'users',
  'products',
  'suppliers',
  'purchase_orders',
  'purchase_order_items',
  'stock_ins',
  'stock_in_items',
  'stock_outs',
  'stock_out_items',
  'serial_numbers',
  'stock_adjustments',
  'stock_adjustment_items',
  'stock_movement_logs',
  'low_stock_notification_logs',
] as const;
