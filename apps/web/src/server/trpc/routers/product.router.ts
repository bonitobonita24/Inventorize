// Product router — tenant-scoped CRUD + search + history

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, tenantProcedure, tenantMutationProcedure } from '../trpc';
import { requireRole } from '../middleware/rbac';
import { UserRole } from '@inventorize/shared/enums';
import { prisma } from '@inventorize/db';
import { withTenantContext } from '@inventorize/db';
import { pricingSelectForRole } from '@/server/lib/pricing-select';

export const productRouter = createTRPCRouter({
  list: tenantProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(200).default(50),
        search: z.string().optional(),
        category: z.string().optional(),
        isActive: z.boolean().optional(),
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
            ...(input.search !== undefined
              ? {
                  OR: [
                    { name: { contains: input.search, mode: 'insensitive' as const } },
                    { productCode: { contains: input.search, mode: 'insensitive' as const } },
                    { barcodeValue: { contains: input.search, mode: 'insensitive' as const } },
                  ],
                }
              : {}),
            ...(input.category !== undefined ? { category: input.category } : {}),
            ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
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
                barcodeValue: true,
                name: true,
                category: true,
                unit: true,
                currentQuantity: true,
                lowStockThreshold: true,
                serialTrackingEnabled: true,
                isActive: true,
                // Pricing visible based on role — warehouse_staff excluded
                ...(ctx.roles.includes(UserRole.WAREHOUSE_STAFF)
                  ? { sellingPrice: true }
                  : {
                      supplierCost: true,
                      markupPercent: true,
                      sellingPrice: true,
                    }),
              },
            }),
            prisma.product.count({ where }),
          ]);

          return {
            items,
            total,
            page: input.page,
            limit: input.limit,
            totalPages: Math.ceil(total / input.limit),
          };
        },
      );
    }),

  byId: tenantProcedure
    .input(z.object({ id: z.string().cuid() }).strict())
    .query(async ({ ctx, input }) => {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      const tenantId = ctx.tenantId!;
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      const userId = ctx.userId!;
      return withTenantContext(
        { tenantId, userId },
        async () => {
          const role = ctx.roles.includes(UserRole.WAREHOUSE_STAFF)
            ? UserRole.WAREHOUSE_STAFF
            : ctx.roles.includes(UserRole.PURCHASING_STAFF)
              ? UserRole.PURCHASING_STAFF
              : UserRole.ADMIN;

          const product = await prisma.product.findFirst({
            where: { id: input.id, tenantId },
            select: {
              id: true,
              productCode: true,
              barcodeValue: true,
              name: true,
              category: true,
              unit: true,
              currentQuantity: true,
              lowStockThreshold: true,
              serialTrackingEnabled: true,
              isActive: true,
              ...pricingSelectForRole(role),
            },
          });
          if (product === null) {
            return null;
          }
          return product;
        },
      );
    }),

  create: tenantMutationProcedure
    .use(requireRole(UserRole.ADMIN))
    .input(
      z.object({
        productCode: z.string().min(1).max(50),
        barcodeValue: z.string().min(1).max(100),
        name: z.string().min(1).max(200),
        category: z.string().min(1).max(100),
        unit: z.string().min(1).max(50),
        supplierCost: z.number().min(0),
        markupPercent: z.number().min(0),
        lowStockThreshold: z.number().int().min(0),
        serialTrackingEnabled: z.boolean(),
      }).strict(),
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.tenantId!;
      const userId = ctx.userId!;
      return withTenantContext(
        { tenantId, userId },
        async () => {
          // Check for duplicate productCode within tenant
          const duplicateCode = await prisma.product.findFirst({
            where: { tenantId, productCode: input.productCode },
            select: { id: true },
          });
          if (duplicateCode !== null) {
            throw new TRPCError({
              code: 'CONFLICT',
              message: 'A product with this code already exists in your organization.',
            });
          }

          // Check for duplicate barcodeValue within tenant
          const duplicateBarcode = await prisma.product.findFirst({
            where: { tenantId, barcodeValue: input.barcodeValue },
            select: { id: true },
          });
          if (duplicateBarcode !== null) {
            throw new TRPCError({
              code: 'CONFLICT',
              message: 'A product with this barcode already exists in your organization.',
            });
          }

          const sellingPrice = input.supplierCost + (input.supplierCost * input.markupPercent / 100);

          return prisma.product.create({
            data: {
              ...input,
              tenantId,
              sellingPrice,
              currentQuantity: 0,
              isActive: true,
            },
          });
        },
      );
    }),

  serialsByProductId: tenantProcedure
    .input(
      z.object({
        productId: z.string().cuid(),
        status: z.enum(['in_stock', 'issued', 'adjusted']).optional(),
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
          const where = {
            tenantId,
            productId: input.productId,
            ...(input.status !== undefined ? { status: input.status } : {}),
          };
          const [items, total] = await Promise.all([
            prisma.serialNumber.findMany({
              where,
              skip: (input.page - 1) * input.limit,
              take: input.limit,
              orderBy: { serialValue: 'asc' },
              select: {
                id: true,
                serialValue: true,
                barcodeValue: true,
                status: true,
                stockInItemId: true,
                stockOutItemId: true,
              },
            }),
            prisma.serialNumber.count({ where }),
          ]);
          return { items, total, page: input.page, limit: input.limit, totalPages: Math.ceil(total / input.limit) };
        },
      );
    }),

  update: tenantMutationProcedure
    .use(requireRole(UserRole.ADMIN))
    .input(
      z.object({
        id: z.string().cuid(),
        productCode: z.string().min(1).max(50).optional(),
        barcodeValue: z.string().min(1).max(100).optional(),
        name: z.string().min(1).max(200).optional(),
        category: z.string().min(1).max(100).optional(),
        unit: z.string().min(1).max(50).optional(),
        supplierCost: z.number().min(0).optional(),
        markupPercent: z.number().min(0).optional(),
        lowStockThreshold: z.number().int().min(0).optional(),
        serialTrackingEnabled: z.boolean().optional(),
        isActive: z.boolean().optional(),
      }).strict(),
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.tenantId!;
      const userId = ctx.userId!;
      return withTenantContext(
        { tenantId, userId },
        async () => {
          const { id, ...data } = input;

          // Check for duplicate productCode within tenant (excluding self)
          if (data.productCode !== undefined) {
            const duplicateCode = await prisma.product.findFirst({
              where: { tenantId, productCode: data.productCode, id: { not: id } },
              select: { id: true },
            });
            if (duplicateCode !== null) {
              throw new TRPCError({
                code: 'CONFLICT',
                message: 'A product with this code already exists in your organization.',
              });
            }
          }

          // Check for duplicate barcodeValue within tenant (excluding self)
          if (data.barcodeValue !== undefined) {
            const duplicateBarcode = await prisma.product.findFirst({
              where: { tenantId, barcodeValue: data.barcodeValue, id: { not: id } },
              select: { id: true },
            });
            if (duplicateBarcode !== null) {
              throw new TRPCError({
                code: 'CONFLICT',
                message: 'A product with this barcode already exists in your organization.',
              });
            }
          }

          // Recalculate sellingPrice if pricing fields changed
          const updateData: Record<string, unknown> = { ...data };
          if (data.supplierCost !== undefined || data.markupPercent !== undefined) {
            const existing = await prisma.product.findFirst({
              where: { id, tenantId },
            });
            if (existing === null) {
              throw new TRPCError({ code: 'NOT_FOUND', message: 'Resource not found.' });
            }
            const cost = data.supplierCost ?? existing.supplierCost.toNumber();
            const markup = data.markupPercent ?? existing.markupPercent.toNumber();
            updateData['sellingPrice'] = cost + (cost * markup / 100);
          }

          return prisma.product.update({
            where: { id },
            data: updateData,
          });
        },
      );
    }),
});
