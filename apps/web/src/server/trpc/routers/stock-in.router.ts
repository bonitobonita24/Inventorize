// Stock in router — tenant-scoped receiving with atomic quantity updates

import { z } from 'zod';
import { createTRPCRouter, tenantProcedure } from '../trpc';
import { requireRole } from '../middleware/rbac';
import { UserRole } from '@inventorize/shared/enums';
import { prisma } from '@inventorize/db';
import { withTenantContext } from '@inventorize/db';

export const stockInRouter = createTRPCRouter({
  list: tenantProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(200).default(50),
      }).strict(),
    )
    .query(async ({ ctx, input }) => {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      const tenantId = ctx.tenantId!;
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      const userId = ctx.userId!;
      return withTenantContext(
        { tenantId, userId },
        async () => {
          const where = { tenantId };
          const [items, total] = await Promise.all([
            prisma.stockIn.findMany({
              where,
              skip: (input.page - 1) * input.limit,
              take: input.limit,
              orderBy: { createdAt: 'desc' },
              include: { items: { include: { product: { select: { name: true } } } } },
            }),
            prisma.stockIn.count({ where }),
          ]);
          return { items, total, page: input.page, limit: input.limit, totalPages: Math.ceil(total / input.limit) };
        },
      );
    }),

  create: tenantProcedure
    .use(requireRole(UserRole.ADMIN, UserRole.WAREHOUSE_STAFF, UserRole.PURCHASING_STAFF))
    .input(
      z.object({
        purchaseOrderId: z.string().cuid().nullable().default(null),
        receivedDate: z.string().datetime(),
        notes: z.string().max(2000).nullable().default(null),
        items: z.array(
          z.object({
            productId: z.string().cuid(),
            quantity: z.number().int().min(1),
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
          // Atomic transaction — stock in + quantity update + movement log
          return prisma.$transaction(async (tx) => {
            const stockIn = await tx.stockIn.create({
              data: {
                tenantId,
                referenceNumber: `SI-${Date.now()}`,
                purchaseOrderId: input.purchaseOrderId,
                receivedDate: new Date(input.receivedDate),
                receivedByUserId: userId,
                notes: input.notes,
                items: { create: input.items.map((item) => ({ ...item, tenantId })) },
              },
            });

            // Fetch items separately — $extends client loses include types in transactions
            const stockInItems = await tx.stockInItem.findMany({
              where: { stockInId: stockIn.id },
            });

            // Update product quantities and create movement logs
            for (const item of stockInItems) {
              const product = await tx.product.findFirstOrThrow({
                where: { id: item.productId, tenantId },
              });

              await tx.product.update({
                where: { id: item.productId },
                data: { currentQuantity: { increment: item.quantity } },
              });

              await tx.stockMovementLog.create({
                data: {
                  tenantId,
                  productId: item.productId,
                  movementType: 'stock_in',
                  referenceType: 'StockIn',
                  referenceId: stockIn.id,
                  quantityBefore: product.currentQuantity,
                  quantityDelta: item.quantity,
                  quantityAfter: product.currentQuantity + item.quantity,
                  performedByUserId: userId,
                  performedAt: new Date(),
                },
              });
            }

            return stockIn;
          });
        },
      );
    }),
});
