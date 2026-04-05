// Stock in router — tenant-scoped receiving with atomic quantity updates + serial tracking

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, tenantProcedure, tenantMutationProcedure } from '../trpc';
import { requireRole } from '../middleware/rbac';
import { UserRole } from '@inventorize/shared/enums';
import { prisma } from '@inventorize/db';
import { withTenantContext } from '@inventorize/db';
import { getDownloadUrl, deleteFile } from '@inventorize/storage';

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

  create: tenantMutationProcedure
    .use(requireRole(UserRole.ADMIN, UserRole.WAREHOUSE_STAFF, UserRole.PURCHASING_STAFF))
    .input(
      z.object({
        purchaseOrderId: z.string().cuid().nullable().default(null),
        receivedDate: z.string().datetime(),
        notes: z.string().max(2000).nullable().default(null),
        attachmentUrl: z.string().max(500).nullable().default(null),
        items: z.array(
          z.object({
            productId: z.string().cuid(),
            quantity: z.number().int().min(1),
            supplierCostSnapshot: z.number().min(0),
            // serialValues required when product.serialTrackingEnabled; count must equal quantity
            serialValues: z.array(z.string().min(1).max(100)).optional(),
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
          // Pre-validate serial counts before entering the transaction
          for (const item of input.items) {
            const product = await prisma.product.findFirst({
              where: { id: item.productId, tenantId },
              select: { serialTrackingEnabled: true, name: true },
            });
            if (product === null) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Product not found.' });
            if (product.serialTrackingEnabled) {
              const count = (item.serialValues ?? []).length;
              if (count !== item.quantity) {
                throw new TRPCError({
                  code: 'BAD_REQUEST',
                  message: `${product.name} requires exactly ${item.quantity} serial number(s). Got ${count}.`,
                });
              }
            }
          }

          // Atomic transaction — stock in + serial records + quantity update + movement log
          type PrismaTx = Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;
          return prisma.$transaction(async (tx: PrismaTx) => {
            const stockIn = await tx.stockIn.create({
              data: {
                tenantId,
                referenceNumber: `SI-${Date.now()}`,
                purchaseOrderId: input.purchaseOrderId,
                receivedDate: new Date(input.receivedDate),
                receivedByUserId: userId,
                notes: input.notes,
                attachmentUrl: input.attachmentUrl,
                items: {
                  create: input.items.map(({ productId, quantity, supplierCostSnapshot }) => ({
                    productId,
                    quantity,
                    supplierCostSnapshot,
                    tenantId,
                  })),
                },
              },
            });

            // Fetch items separately — $extends client loses include types in transactions
            const stockInItems = await tx.stockInItem.findMany({
              where: { stockInId: stockIn.id },
            });

            // Update product quantities, create movement logs, and create serial records
            for (const item of stockInItems) {
              const inputItem = input.items.find((i) => i.productId === item.productId);
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

              // Create serial number records when product is serial-tracked
              const serialValues = inputItem?.serialValues ?? [];
              if (serialValues.length > 0) {
                // Validate uniqueness within tenant+product
                const existing = await tx.serialNumber.findFirst({
                  where: { tenantId, productId: item.productId, serialValue: { in: serialValues } },
                  select: { serialValue: true },
                });
                if (existing !== null) {
                  throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: `Serial number "${existing.serialValue}" already exists for this product.`,
                  });
                }
                await tx.serialNumber.createMany({
                  data: serialValues.map((sv) => ({
                    tenantId,
                    productId: item.productId,
                    serialValue: sv,
                    status: 'in_stock' as const,
                    stockInItemId: item.id,
                  })),
                });
              }
            }

            // Update PO received quantities and auto-update status when linked
            if (input.purchaseOrderId !== null) {
              for (const item of stockInItems) {
                await tx.purchaseOrderItem.updateMany({
                  where: {
                    purchaseOrderId: input.purchaseOrderId,
                    productId: item.productId,
                    tenantId,
                  },
                  data: { receivedQty: { increment: item.quantity } },
                });
              }

              // Re-fetch after increments to determine new PO status
              const poItems = await tx.purchaseOrderItem.findMany({
                where: { purchaseOrderId: input.purchaseOrderId, tenantId },
                select: { orderedQty: true, receivedQty: true },
              });

              const allReceived = poItems.every((poi: typeof poItems[number]) => poi.receivedQty >= poi.orderedQty);
              const anyReceived = poItems.some((poi: typeof poItems[number]) => poi.receivedQty > 0);
              const newStatus = allReceived ? 'received' : anyReceived ? 'partially_received' : 'ordered';

              await tx.purchaseOrder.update({
                where: { id: input.purchaseOrderId },
                data: { status: newStatus },
              });
            }

            return stockIn;
          });
        },
      );
    }),

  getAttachmentUrl: tenantProcedure
    .input(z.object({ id: z.string().cuid() }).strict())
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.tenantId;
      const userId = ctx.userId!;
      return withTenantContext({ tenantId, userId }, async () => {
        const stockIn = await prisma.stockIn.findFirst({
          where: { id: input.id, tenantId },
          select: { attachmentUrl: true },
        });
        if (stockIn === null || stockIn.attachmentUrl === null) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Resource not found.' });
        }
        return { url: await getDownloadUrl(stockIn.attachmentUrl, tenantId) };
      });
    }),

  deleteAttachment: tenantMutationProcedure
    .use(requireRole(UserRole.ADMIN, UserRole.WAREHOUSE_STAFF))
    .input(z.object({ id: z.string().cuid() }).strict())
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.tenantId!;
      const userId = ctx.userId!;
      return withTenantContext({ tenantId, userId }, async () => {
        const stockIn = await prisma.stockIn.findFirst({
          where: { id: input.id, tenantId },
          select: { attachmentUrl: true },
        });
        if (stockIn === null || stockIn.attachmentUrl === null) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Resource not found.' });
        }
        await deleteFile(stockIn.attachmentUrl, tenantId);
        await prisma.stockIn.update({
          where: { id: input.id },
          data: { attachmentUrl: null },
        });
        return { success: true };
      });
    }),
});
