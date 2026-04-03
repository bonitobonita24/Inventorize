// Platform router — superadmin operations (cross-tenant, no L6 guard)
// Uses platformPrisma — dedicated client WITHOUT tenant-guard extension.

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { requireRole } from '../middleware/rbac';
import { UserRole } from '@inventorize/shared/enums';
import { platformPrisma } from '@inventorize/db';

const superAdminProcedure = protectedProcedure.use(requireRole(UserRole.SUPER_ADMIN));

export const platformRouter = createTRPCRouter({
  listTenants: superAdminProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(200).default(50),
        search: z.string().optional(),
        status: z.enum(['active', 'suspended', 'trial']).optional(),
      }).strict(),
    )
    .query(async ({ input }) => {
      const where = {
        ...(input.search !== undefined
          ? {
              OR: [
                { name: { contains: input.search, mode: 'insensitive' as const } },
                { slug: { contains: input.search, mode: 'insensitive' as const } },
              ],
            }
          : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      };
      const [items, total] = await Promise.all([
        platformPrisma.tenant.findMany({
          where,
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          orderBy: { createdAt: 'desc' },
          include: { _count: { select: { users: true, products: true } } },
        }),
        platformPrisma.tenant.count({ where }),
      ]);
      return { items, total, page: input.page, limit: input.limit, totalPages: Math.ceil(total / input.limit) };
    }),

  getTenant: superAdminProcedure
    .input(z.object({ id: z.string().cuid() }).strict())
    .query(async ({ input }) => {
      const tenant = await platformPrisma.tenant.findUnique({
        where: { id: input.id },
        include: {
          _count: {
            select: { users: true, products: true, suppliers: true, purchaseOrders: true },
          },
        },
      });
      if (tenant === null) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Resource not found.' });
      }
      return tenant;
    }),

  updateTenantStatus: superAdminProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        status: z.enum(['active', 'suspended', 'trial']),
      }).strict(),
    )
    .mutation(async ({ ctx, input }) => {
      const tenant = await platformPrisma.tenant.findUnique({ where: { id: input.id } });
      if (tenant === null) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Resource not found.' });
      }

      const updated = await platformPrisma.tenant.update({
        where: { id: input.id },
        data: { status: input.status },
      });

      // PLATFORM: audit log for cross-tenant operations
      await platformPrisma.auditLog.create({
        data: {
          tenantId: input.id,
          actorUserId: ctx.userId!,
          actionType: 'PLATFORM:UPDATE_TENANT_STATUS',
          entityType: 'Tenant',
          entityId: input.id,
          beforeStateJson: { status: tenant.status },
          afterStateJson: { status: input.status },
        },
      });

      return updated;
    }),

  platformMetrics: superAdminProcedure
    .query(async () => {
      const [totalTenants, activeTenants, totalUsers, totalProducts] = await Promise.all([
        platformPrisma.tenant.count(),
        platformPrisma.tenant.count({ where: { status: 'active' } }),
        platformPrisma.user.count(),
        platformPrisma.product.count(),
      ]);
      return { totalTenants, activeTenants, totalUsers, totalProducts };
    }),

  platformAuditLogs: superAdminProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(200).default(50),
        actionType: z.string().optional(),
      }).strict(),
    )
    .query(async ({ input }) => {
      const where = {
        actionType: { startsWith: 'PLATFORM:' },
        ...(input.actionType !== undefined ? { actionType: input.actionType } : {}),
      };
      const [items, total] = await Promise.all([
        platformPrisma.auditLog.findMany({
          where,
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          orderBy: { createdAt: 'desc' },
          include: {
            actorUser: { select: { name: true, email: true } },
            tenant: { select: { name: true, slug: true } },
          },
        }),
        platformPrisma.auditLog.count({ where }),
      ]);
      return { items, total, page: input.page, limit: input.limit, totalPages: Math.ceil(total / input.limit) };
    }),
});
