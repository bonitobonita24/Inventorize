// Audit log router — tenant-scoped immutable audit trail (read-only)

import { z } from 'zod';
import { createTRPCRouter, tenantProcedure } from '../trpc';
import { requireRole } from '../middleware/rbac';
import { UserRole } from '@inventorize/shared/enums';
import { prisma } from '@inventorize/db';
import { withTenantContext } from '@inventorize/db';

export const auditLogRouter = createTRPCRouter({
  list: tenantProcedure
    .use(requireRole(UserRole.ADMIN))
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(200).default(50),
        entityType: z.string().optional(),
        entityId: z.string().optional(),
        actorUserId: z.string().cuid().optional(),
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
      }).strict(),
    )
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.tenantId!;
      const userId = ctx.userId!;
      return withTenantContext(
        { tenantId, userId },
        async () => {
          const where = {
            tenantId,
            ...(input.entityType !== undefined ? { entityType: input.entityType } : {}),
            ...(input.entityId !== undefined ? { entityId: input.entityId } : {}),
            ...(input.actorUserId !== undefined ? { actorUserId: input.actorUserId } : {}),
            ...(input.startDate !== undefined || input.endDate !== undefined
              ? {
                  createdAt: {
                    ...(input.startDate !== undefined ? { gte: new Date(input.startDate) } : {}),
                    ...(input.endDate !== undefined ? { lte: new Date(input.endDate) } : {}),
                  },
                }
              : {}),
          };
          const [items, total] = await Promise.all([
            prisma.auditLog.findMany({
              where,
              skip: (input.page - 1) * input.limit,
              take: input.limit,
              orderBy: { createdAt: 'desc' },
              include: {
                actorUser: { select: { name: true, email: true } },
              },
            }),
            prisma.auditLog.count({ where }),
          ]);
          return { items, total, page: input.page, limit: input.limit, totalPages: Math.ceil(total / input.limit) };
        },
      );
    }),
});
