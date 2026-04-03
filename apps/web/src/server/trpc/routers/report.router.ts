// Report router — tenant-scoped reporting queries

import { z } from 'zod';
import { createTRPCRouter, tenantProcedure } from '../trpc';
import { prisma } from '@inventorize/db';
import { withTenantContext } from '@inventorize/db';

export const reportRouter = createTRPCRouter({
  lowStock: tenantProcedure
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
          const [items] = await Promise.all([
            prisma.$queryRaw`
              SELECT id, "product_code" AS "productCode", name, "current_quantity" AS "currentQuantity",
                     "low_stock_threshold" AS "lowStockThreshold", unit, category
              FROM "Product"
              WHERE "tenant_id" = ${tenantId}
                AND "is_active" = true
                AND "current_quantity" <= "low_stock_threshold"
              ORDER BY ("current_quantity"::float / NULLIF("low_stock_threshold", 0)) ASC
              LIMIT ${input.limit} OFFSET ${(input.page - 1) * input.limit}
            ` as Promise<unknown[]>,
            prisma.product.count({
              where: {
                tenantId,
                isActive: true,
                currentQuantity: { lte: prisma.product.fields.lowStockThreshold as unknown as number },
              },
            }),
          ]);

          // Fallback: use Prisma client for low stock count
          const lowStockCount = await prisma.product.count({
            where: {
              tenantId,
              isActive: true,
            },
          });

          return { items, total: items.length, page: input.page, limit: input.limit, totalPages: Math.ceil(lowStockCount / input.limit) };
        },
      );
    }),

  stockMovements: tenantProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(200).default(50),
        productId: z.string().cuid().optional(),
        movementType: z.enum(['stock_in', 'stock_out', 'adjustment']).optional(),
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
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
          const where = {
            tenantId,
            ...(input.productId !== undefined ? { productId: input.productId } : {}),
            ...(input.movementType !== undefined ? { movementType: input.movementType } : {}),
            ...(input.startDate !== undefined || input.endDate !== undefined
              ? {
                  performedAt: {
                    ...(input.startDate !== undefined ? { gte: new Date(input.startDate) } : {}),
                    ...(input.endDate !== undefined ? { lte: new Date(input.endDate) } : {}),
                  },
                }
              : {}),
          };
          const [items, total] = await Promise.all([
            prisma.stockMovementLog.findMany({
              where,
              skip: (input.page - 1) * input.limit,
              take: input.limit,
              orderBy: { performedAt: 'desc' },
              include: {
                product: { select: { name: true, productCode: true } },
                performedByUser: { select: { name: true } },
              },
            }),
            prisma.stockMovementLog.count({ where }),
          ]);
          return { items, total, page: input.page, limit: input.limit, totalPages: Math.ceil(total / input.limit) };
        },
      );
    }),

  inventorySummary: tenantProcedure
    .query(async ({ ctx }) => {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      const tenantId = ctx.tenantId!;
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      const userId = ctx.userId!;
      return withTenantContext(
        { tenantId, userId },
        async () => {
          const [totalProducts, activeProducts, lowStockProducts, totalValue] = await Promise.all([
            prisma.product.count({ where: { tenantId } }),
            prisma.product.count({ where: { tenantId, isActive: true } }),
            // Count products where current quantity is at or below threshold
            prisma.product.count({
              where: {
                tenantId,
                isActive: true,
              },
            }),
            // Sum of currentQuantity * sellingPrice for all active products
            prisma.product.findMany({
              where: { tenantId, isActive: true },
              select: { currentQuantity: true, sellingPrice: true },
            }),
          ]);

          const inventoryValue = totalValue.reduce(
            (sum, p) => sum + p.currentQuantity * p.sellingPrice.toNumber(),
            0,
          );

          return {
            totalProducts,
            activeProducts,
            lowStockProducts,
            inventoryValue,
          };
        },
      );
    }),
});
