// Stock adjustment router — tenant-scoped inventory corrections with atomic updates

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, tenantProcedure } from '../trpc';
import { requireRole } from '../middleware/rbac';
import { UserRole } from '@inventorize/shared/enums';
import { prisma } from '@inventorize/db';
import { withTenantContext } from '@inventorize/db';

export const stockAdjustmentRouter = createTRPCRouter({
  list: tenantProcedure
    .use(requireRole(UserRole.ADMIN))
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(200).default(50),
      }).strict(),
    )
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.tenantId!;
      const userId = ctx.userId!;
      return withTenantContext(
        { tenantId, userId },
        async () => {
          const where = { tenantId };
          const [items, total] = await Promise.all([
            prisma.stockAdjustment.findMany({
              where,
              skip: (input.page - 1) * input.limit,
              take: input.limit,
              orderBy: { createdAt: 'desc' },
              include: {
                createdByUser: { select: { name: true } },
                approvedByUser: { select: { name: true } },
                items: { include: { product: { select: { name: true } } } },
              },
            }),
            prisma.stockAdjustment.count({ where }),
          ]);
          return { items, total, page: input.page, limit: input.limit, totalPages: Math.ceil(total / input.limit) };
        },
      );
    }),

  create: tenantProcedure
    .use(requireRole(UserRole.ADMIN))
    .input(
      z.object({
        adjustmentDate: z.string().datetime(),
        reason: z.enum(['recount', 'damage', 'theft', 'correction', 'other']),
        notes: z.string().max(2000).nullable().default(null),
        items: z.array(
          z.object({
            productId: z.string().cuid(),
            quantityDelta: z.number().int(),
            serialNumberId: z.string().cuid().optional(),
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
          return prisma.$transaction(async (tx) => {
            // Validate all products exist and stock won't go negative
            for (const item of input.items) {
              const product = await tx.product.findFirstOrThrow({
                where: { id: item.productId, tenantId },
              });
              if (product.currentQuantity + item.quantityDelta < 0) {
                throw new TRPCError({
                  code: 'BAD_REQUEST',
                  message: `Adjustment would result in negative stock for ${product.name}.`,
                });
              }

              // Validate serial number if provided — must be in_stock
              if (item.serialNumberId !== undefined) {
                const serial = await tx.serialNumber.findFirst({
                  where: { id: item.serialNumberId, productId: item.productId, tenantId },
                });
                if (serial === null) {
                  throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: `Serial number not found for product ${product.name}.`,
                  });
                }
                if (serial.status !== 'in_stock') {
                  throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: `Serial number is "${serial.status}" — only in_stock serials can be adjusted.`,
                  });
                }
              }
            }

            const adjustment = await tx.stockAdjustment.create({
              data: {
                tenantId,
                adjustmentDate: new Date(input.adjustmentDate),
                reason: input.reason,
                notes: input.notes,
                createdByUserId: userId,
                items: {
                  create: input.items.map((item) => ({
                    productId: item.productId,
                    quantityDelta: item.quantityDelta,
                    tenantId,
                    ...(item.serialNumberId !== undefined ? { serialNumberId: item.serialNumberId } : {}),
                  })),
                },
              },
            });

            // Fetch items separately — $extends client loses include types in transactions
            const adjustmentItems = await tx.stockAdjustmentItem.findMany({
              where: { stockAdjustmentId: adjustment.id },
            });

            // Apply quantity changes and create movement logs
            for (const item of adjustmentItems) {
              const product = await tx.product.findFirstOrThrow({
                where: { id: item.productId, tenantId },
              });

              if (item.quantityDelta > 0) {
                await tx.product.update({
                  where: { id: item.productId },
                  data: { currentQuantity: { increment: item.quantityDelta } },
                });
              } else {
                await tx.product.update({
                  where: { id: item.productId },
                  data: { currentQuantity: { decrement: Math.abs(item.quantityDelta) } },
                });
              }

              await tx.stockMovementLog.create({
                data: {
                  tenantId,
                  productId: item.productId,
                  movementType: 'adjustment',
                  referenceType: 'StockAdjustment',
                  referenceId: adjustment.id,
                  quantityBefore: product.currentQuantity,
                  quantityDelta: item.quantityDelta,
                  quantityAfter: product.currentQuantity + item.quantityDelta,
                  performedByUserId: userId,
                  notes: `${input.reason}: ${input.notes ?? 'No notes'}`,
                  performedAt: new Date(),
                  ...(item.serialNumberId !== null ? { serialNumberId: item.serialNumberId } : {}),
                },
              });

              // Update serial number status if provided
              if (item.serialNumberId !== null) {
                await tx.serialNumber.update({
                  where: { id: item.serialNumberId },
                  data: { status: 'adjusted' },
                });
              }
            }

            return adjustment;
          });
        },
      );
    }),
});
