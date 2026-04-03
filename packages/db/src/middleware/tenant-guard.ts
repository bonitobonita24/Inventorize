// L6 — Prisma query guardrails (always active)
// Auto-injects tenantId into EVERY query operation via $allOperations.
// Uses AsyncLocalStorage context from context.ts.
// DO NOT replace $allOperations with individual method names —
// any unlisted method becomes an unguarded tenant bypass.

import { Prisma } from '@prisma/client';
import { getTenantContext } from '../context';

/** Models that are NOT tenant-scoped (system-level tables). */
const SYSTEM_MODELS = new Set(['AuditLog', 'Tenant', 'VerificationToken']);

/**
 * L6 Prisma extension — auto-injects tenantId on every query.
 * Covers: findMany, findFirst, findUnique, create, createMany,
 * update, updateMany, delete, deleteMany, count, aggregate, groupBy.
 */
export const tenantGuardExtension = Prisma.defineExtension({
  query: {
    $allModels: {
      async $allOperations({
        args,
        query,
        model,
      }: {
        args: Record<string, unknown>;
        query: (args: Record<string, unknown>) => Promise<unknown>;
        model: string;
        operation: string;
      }) {
        // Skip system tables that are not tenant-scoped
        if (SYSTEM_MODELS.has(model)) {
          return query(args);
        }

        const ctx = getTenantContext();
        const tenantId = ctx?.tenantId;

        // If no tenant context is set, allow the query to proceed
        // without injection. This supports:
        // - Seed scripts running outside request context
        // - Platform-level (superadmin) queries using platformPrisma
        // The platformPrisma client does NOT use this extension at all.
        if (tenantId === undefined) {
          return query(args);
        }

        // Inject tenantId into WHERE clause for reads
        if ('where' in args && args['where'] !== undefined) {
          const where = args['where'] as Record<string, unknown>;
          args['where'] = { ...where, tenantId };
        } else if (
          'where' in args ||
          // Operations that support where: findMany, findFirst, findUnique,
          // update, updateMany, delete, deleteMany, count, aggregate, groupBy
          !('data' in args)
        ) {
          args['where'] = { tenantId };
        }

        // Inject tenantId into DATA clause for writes
        if ('data' in args && args['data'] !== undefined) {
          const data = args['data'];
          if (!Array.isArray(data)) {
            const dataObj = data as Record<string, unknown>;
            args['data'] = { ...dataObj, tenantId };
          }
          // createMany with array: each item gets tenantId
          if (Array.isArray(data)) {
            args['data'] = (data as Record<string, unknown>[]).map(
              (item) => ({ ...item, tenantId }),
            );
          }
        }

        return query(args);
      },
    },
  },
});
