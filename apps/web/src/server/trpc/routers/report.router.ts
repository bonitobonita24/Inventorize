// Report router — tenant-scoped reporting queries

import { z } from 'zod';
import { createTRPCRouter, tenantProcedure } from '../trpc';
import { requireRole } from '../middleware/rbac';
import { UserRole } from '@inventorize/shared/enums';
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
          const [totalProducts, activeProducts, lowStockRaw, totalValue] = await Promise.all([
            prisma.product.count({ where: { tenantId } }),
            prisma.product.count({ where: { tenantId, isActive: true } }),
            prisma.product.findMany({
              where: { tenantId, isActive: true },
              select: { currentQuantity: true, lowStockThreshold: true },
            }),
            prisma.product.findMany({
              where: { tenantId, isActive: true },
              select: { currentQuantity: true, sellingPrice: true },
            }),
          ]);

          const lowStockProducts = lowStockRaw.filter(
            (p) => p.currentQuantity <= p.lowStockThreshold,
          ).length;

          const inventoryValue = totalValue.reduce(
            (sum, p) => sum + p.currentQuantity * p.sellingPrice.toNumber(),
            0,
          );

          return { totalProducts, activeProducts, lowStockProducts, inventoryValue };
        },
      );
    }),

  // Log a CSV export event to the immutable audit trail
  logExport: tenantProcedure
    .input(
      z.object({
        reportType: z.string().min(1).max(100),
        filters: z.record(z.unknown()).optional(),
      }).strict(),
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.tenantId!;
      const userId = ctx.userId!;
      return withTenantContext({ tenantId, userId }, async () => {
        await prisma.auditLog.create({
          data: {
            tenantId,
            actorUserId: userId,
            actionType: 'EXPORT',
            entityType: 'Report',
            entityId: input.reportType,
            afterStateJson: input.filters ?? {},
          },
        });
        return { success: true };
      });
    }),

  // Period-based stock movement counts for dashboard KPI cards
  movementCounts: tenantProcedure
    .input(
      z.object({
        days: z.number().int().min(1).max(365).default(30),
      }).strict(),
    )
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.tenantId!;
      const userId = ctx.userId!;
      return withTenantContext({ tenantId, userId }, async () => {
        const since = new Date();
        since.setDate(since.getDate() - input.days);
        const [stockInCount, stockOutCount] = await Promise.all([
          prisma.stockMovementLog.count({
            where: { tenantId, movementType: 'stock_in', performedAt: { gte: since } },
          }),
          prisma.stockMovementLog.count({
            where: { tenantId, movementType: 'stock_out', performedAt: { gte: since } },
          }),
        ]);
        return { stockInCount, stockOutCount, days: input.days };
      });
    }),

  // Full inventory snapshot — all active products with current quantity and value
  inventorySnapshot: tenantProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(200).default(50),
        search: z.string().max(100).optional(),
        category: z.string().max(100).optional(),
      }).strict(),
    )
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.tenantId;
      const userId = ctx.userId!;
      const isAdminOrPurchasing =
        ctx.roles.includes('admin') || ctx.roles.includes('purchasing_staff');
      return withTenantContext({ tenantId, userId }, async () => {
        const where = {
          tenantId,
          isActive: true,
          ...(input.search !== undefined && input.search.length > 0
            ? {
                OR: [
                  { name: { contains: input.search, mode: 'insensitive' as const } },
                  { productCode: { contains: input.search, mode: 'insensitive' as const } },
                ],
              }
            : {}),
          ...(input.category !== undefined && input.category.length > 0
            ? { category: { equals: input.category, mode: 'insensitive' as const } }
            : {}),
        };
        const [items, total] = await Promise.all([
          prisma.product.findMany({
            where,
            skip: (input.page - 1) * input.limit,
            take: input.limit,
            orderBy: { name: 'asc' },
            select: {
              id: true,
              productCode: true,
              name: true,
              category: true,
              unit: true,
              currentQuantity: true,
              lowStockThreshold: true,
              sellingPrice: true,
              serialTrackingEnabled: true,
              // Cost fields only for admin / purchasing_staff
              ...(isAdminOrPurchasing
                ? { supplierCost: true, markupPercent: true }
                : {}),
            },
          }),
          prisma.product.count({ where }),
        ]);
        return {
          items: items.map((p) => ({
            ...p,
            sellingPrice: p.sellingPrice.toNumber(),
            supplierCost:
              isAdminOrPurchasing && 'supplierCost' in p
                ? (p.supplierCost as { toNumber: () => number }).toNumber()
                : null,
            markupPercent:
              isAdminOrPurchasing && 'markupPercent' in p
                ? (p.markupPercent as { toNumber: () => number }).toNumber()
                : null,
            inventoryValue: p.currentQuantity * p.sellingPrice.toNumber(),
            isLowStock: p.currentQuantity <= p.lowStockThreshold,
          })),
          total,
          page: input.page,
          limit: input.limit,
          totalPages: Math.ceil(total / input.limit),
        };
      });
    }),
});
