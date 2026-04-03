// Stock out router — tenant-scoped releasing with atomic quantity updates

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, tenantProcedure } from '../trpc';
import { requireRole } from '../middleware/rbac';
import { UserRole } from '@inventorize/shared/enums';
import { prisma } from '@inventorize/db';
import { withTenantContext } from '@inventorize/db';

export const stockOutRouter = createTRPCRouter({
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
            prisma.stockOut.findMany({
              where,
              skip: (input.page - 1) * input.limit,
              take: input.limit,
              orderBy: { createdAt: 'desc' },
              include: { items: { include: { product: { select: { name: true } } } } },
            }),
            prisma.stockOut.count({ where }),
          ]);
          return { items, total, page: input.page, limit: input.limit, totalPages: Math.ceil(total / input.limit) };
        },
      );
    }),

  create: tenantProcedure
    .use(requireRole(UserRole.ADMIN, UserRole.WAREHOUSE_STAFF))
    .input(
      z.object({
        releasedDate: z.string().datetime(),
        requestedByName: z.string().min(1).max(200),
        usedFor: z.string().min(1).max(500),
        notes: z.string().max(2000).nullable().default(null),
        items: z.array(
          z.object({
            productId: z.string().cuid(),
            quantity: z.number().int().min(1),
            sellingPriceSnapshot: z.number().min(0),
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
            // Generate slip number (SO-00001 format, per-tenant sequential)
            const lastOut = await tx.stockOut.findFirst({
              where: { tenantId },
              orderBy: { printableSlipNumber: 'desc' },
              select: { printableSlipNumber: true },
            });
            const lastNum = lastOut !== null
              ? parseInt(lastOut.printableSlipNumber.replace('SO-', ''), 10)
              : 0;
            const slipNumber = `SO-${String(lastNum + 1).padStart(5, '0')}`;

            // Validate sufficient stock for all items
            for (const item of input.items) {
              const product = await tx.product.findFirstOrThrow({
                where: { id: item.productId, tenantId },
              });
              if (product.currentQuantity < item.quantity) {
                throw new TRPCError({
                  code: 'BAD_REQUEST',
                  message: `Insufficient stock for ${product.name}. Available: ${product.currentQuantity}`,
                });
              }
            }

            const stockOut = await tx.stockOut.create({
              data: {
                tenantId,
                referenceNumber: `SO-REF-${Date.now()}`,
                releasedDate: new Date(input.releasedDate),
                releasedByUserId: userId,
                requestedByName: input.requestedByName,
                usedFor: input.usedFor,
                notes: input.notes,
                printableSlipNumber: slipNumber,
                items: { create: input.items.map((item) => ({ ...item, tenantId })) },
              },
            });

            // Fetch items separately — $extends client loses include types in transactions
            const stockOutItems = await tx.stockOutItem.findMany({
              where: { stockOutId: stockOut.id },
            });

            // Decrement quantities and create movement logs
            for (const item of stockOutItems) {
              const product = await tx.product.findFirstOrThrow({
                where: { id: item.productId, tenantId },
              });

              await tx.product.update({
                where: { id: item.productId },
                data: { currentQuantity: { decrement: item.quantity } },
              });

              await tx.stockMovementLog.create({
                data: {
                  tenantId,
                  productId: item.productId,
                  movementType: 'stock_out',
                  referenceType: 'StockOut',
                  referenceId: stockOut.id,
                  quantityBefore: product.currentQuantity,
                  quantityDelta: -item.quantity,
                  quantityAfter: product.currentQuantity - item.quantity,
                  performedByUserId: userId,
                  requestedByName: input.requestedByName,
                  usedFor: input.usedFor,
                  performedAt: new Date(),
                },
              });
            }

            return stockOut;
          });
        },
      );
    }),
});
