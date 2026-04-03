// Purchase order router — tenant-scoped CRUD + status management

import { z } from 'zod';
import { createTRPCRouter, tenantProcedure } from '../trpc.js';
import { requireRole } from '../middleware/rbac.js';
import { UserRole } from '@inventorize/shared/enums';
import { prisma } from '@inventorize/db';
import { withTenantContext } from '@inventorize/db';

export const purchaseOrderRouter = createTRPCRouter({
  list: tenantProcedure
    .use(requireRole(UserRole.ADMIN, UserRole.PURCHASING_STAFF))
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(200).default(50),
        status: z.enum(['draft', 'ordered', 'partially_received', 'received', 'cancelled']).optional(),
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
            ...(input.status !== undefined ? { status: input.status } : {}),
          };
          const [items, total] = await Promise.all([
            prisma.purchaseOrder.findMany({
              where,
              skip: (input.page - 1) * input.limit,
              take: input.limit,
              orderBy: { createdAt: 'desc' },
              include: { supplier: { select: { name: true } }, items: true },
            }),
            prisma.purchaseOrder.count({ where }),
          ]);
          return { items, total, page: input.page, limit: input.limit, totalPages: Math.ceil(total / input.limit) };
        },
      );
    }),

  byId: tenantProcedure
    .use(requireRole(UserRole.ADMIN, UserRole.PURCHASING_STAFF))
    .input(z.object({ id: z.string().cuid() }).strict())
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.tenantId!;
      const userId = ctx.userId!;
      return withTenantContext(
        { tenantId, userId },
        async () => {
          return prisma.purchaseOrder.findFirst({
            where: { id: input.id, tenantId },
            include: {
              supplier: true,
              items: { include: { product: { select: { name: true, productCode: true } } } },
            },
          });
        },
      );
    }),

  create: tenantProcedure
    .use(requireRole(UserRole.ADMIN, UserRole.PURCHASING_STAFF))
    .input(
      z.object({
        supplierId: z.string().cuid(),
        orderDate: z.string().datetime(),
        expectedDate: z.string().datetime().nullable().default(null),
        notes: z.string().max(2000).nullable().default(null),
        items: z.array(
          z.object({
            productId: z.string().cuid(),
            orderedQty: z.number().int().min(1),
            supplierCostSnapshot: z.number().min(0),
          }).strict(),
        ).min(1),
      }).strict(),
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.tenantId!;
      const userId = ctx.userId!;
      return withTenantContext(
        { tenantId, userId },
        async () => {
          const { items, ...poData } = input;
          return prisma.purchaseOrder.create({
            data: {
              ...poData,
              tenantId,
              poNumber: `PO-${Date.now()}`,
              status: 'draft',
              createdByUserId: userId,
              items: { create: items.map((item) => ({ ...item, receivedQty: 0, tenantId })) },
            },
            include: { items: true },
          });
        },
      );
    }),

  updateStatus: tenantProcedure
    .use(requireRole(UserRole.ADMIN, UserRole.PURCHASING_STAFF))
    .input(
      z.object({
        id: z.string().cuid(),
        status: z.enum(['ordered', 'partially_received', 'received', 'cancelled']),
      }).strict(),
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.tenantId!;
      const userId = ctx.userId!;
      return withTenantContext(
        { tenantId, userId },
        async () => {
          return prisma.purchaseOrder.update({
            where: { id: input.id },
            data: { status: input.status },
          });
        },
      );
    }),
});
