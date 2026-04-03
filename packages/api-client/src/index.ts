// API Client — @inventorize/api-client
// Typed tRPC client for use by all apps (web, mobile if added later)
// This package provides the tRPC client setup and type-safe caller.
// The actual AppRouter type will be provided by the web app's tRPC router.

import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { AnyRouter } from '@trpc/server';
import superjson from 'superjson';

export type { AnyRouter } from '@trpc/server';

export interface CreateClientOptions {
  url: string;
  headers?: (() => Record<string, string>) | Record<string, string>;
}

/**
 * Creates a typed tRPC client instance.
 * Usage in apps:
 *   import type { AppRouter } from '@/server/trpc/router';
 *   import { createApiClient } from '@inventorize/api-client';
 *   const client = createApiClient<AppRouter>({ url: '/api/trpc' });
 */
export function createApiClient<TRouter extends AnyRouter>(options: CreateClientOptions) {
  // exactOptionalPropertyTypes requires careful handling of the httpBatchLink options.
  // We build the config object explicitly to satisfy tRPC's strict type expectations.
  const config = {
    url: options.url,
    transformer: superjson,
  } as Record<string, unknown>;
  if (options.headers !== undefined) {
    config['headers'] = options.headers;
  }
  return createTRPCClient<TRouter>({
    links: [httpBatchLink(config as never)],
  });
}

// Re-export shared types and schemas for convenience
export type {
  Tenant,
  User,
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
  AppSession,
  PaginationInput,
  PaginatedResult,
} from '@inventorize/shared/types';

export {
  UserRole,
  TenantStatus,
  POStatus,
  SerialNumberStatus,
  MovementType,
  NotificationStatus,
  AdjustmentReason,
} from '@inventorize/shared/enums';
