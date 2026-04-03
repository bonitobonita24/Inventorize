// Tenant context via AsyncLocalStorage
// Separated from index.ts to avoid circular dependency with tenant-guard.

import { AsyncLocalStorage } from 'node:async_hooks';

export interface TenantContext {
  tenantId: string;
  userId: string;
}

const tenantStore = new AsyncLocalStorage<TenantContext>();

/**
 * Run a callback with tenant context set.
 * All Prisma queries inside the callback are automatically scoped to this tenant.
 */
export function withTenantContext<T>(
  ctx: TenantContext,
  fn: () => T,
): T {
  return tenantStore.run(ctx, fn);
}

/**
 * Get the current tenant context. Returns undefined if not inside withTenantContext.
 */
export function getTenantContext(): TenantContext | undefined {
  return tenantStore.getStore();
}

/**
 * Get the current tenantId. Throws if not inside withTenantContext.
 */
export function currentTenantId(): string {
  const ctx = tenantStore.getStore();
  if (ctx === undefined) {
    throw new Error(
      'No tenant context set. Wrap the call in withTenantContext().',
    );
  }
  return ctx.tenantId;
}

/**
 * Get the current userId. Throws if not inside withTenantContext.
 */
export function currentUserId(): string {
  const ctx = tenantStore.getStore();
  if (ctx === undefined) {
    throw new Error(
      'No tenant context set. Wrap the call in withTenantContext().',
    );
  }
  return ctx.userId;
}
