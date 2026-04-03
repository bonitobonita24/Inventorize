// Supplier router — tenant-scoped CRUD

import { z } from 'zod';
import { createTRPCRouter, tenantProcedure } from '../trpc.js';
import { requireRole } from '../middleware/rbac.js';
import { UserRole } from '@inventorize/shared/enums';
import { prisma } from '@inventorize/db';
import { withTenantContext } from '@inventorize/db';
import type { Prisma } from '@inventorize/db';

export const supplierRouter = createTRPCRouter({
  list: tenantProcedure
    .use(requireRole(UserRole.ADMIN, UserRole.PURCHASING_STAFF))
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(200).default(50),
        search: z.string().optional(),
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
            ...(input.search !== undefined
              ? {
                  OR: [
                    { name: { contains: input.search, mode: 'insensitive' as const } },
                    { contactPerson: { contains: input.search, mode: 'insensitive' as const } },
                  ],
                }
              : {}),
          };
          const [items, total] = await Promise.all([
            prisma.supplier.findMany({
              where,
              skip: (input.page - 1) * input.limit,
              take: input.limit,
              orderBy: { name: 'asc' },
            }),
            prisma.supplier.count({ where }),
          ]);
          return { items, total, page: input.page, limit: input.limit, totalPages: Math.ceil(total / input.limit) };
        },
      );
    }),

  create: tenantProcedure
    .use(requireRole(UserRole.ADMIN, UserRole.PURCHASING_STAFF))
    .input(
      z.object({
        name: z.string().min(1).max(200),
        contactPerson: z.string().max(200).nullable().default(null),
        phone: z.string().max(50).nullable().default(null),
        email: z.string().email().nullable().default(null),
        address: z.string().max(500).nullable().default(null),
        notes: z.string().max(2000).nullable().default(null),
      }).strict(),
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.tenantId!;
      const userId = ctx.userId!;
      return withTenantContext(
        { tenantId, userId },
        async () => {
          return prisma.supplier.create({
            data: { ...input, tenantId, isActive: true },
          });
        },
      );
    }),

  update: tenantProcedure
    .use(requireRole(UserRole.ADMIN, UserRole.PURCHASING_STAFF))
    .input(
      z.object({
        id: z.string().cuid(),
        name: z.string().min(1).max(200).optional(),
        contactPerson: z.string().max(200).nullable().optional(),
        phone: z.string().max(50).nullable().optional(),
        email: z.string().email().nullable().optional(),
        address: z.string().max(500).nullable().optional(),
        notes: z.string().max(2000).nullable().optional(),
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
          const updateData: Record<string, unknown> = {};
          if (data.name !== undefined) updateData['name'] = data.name;
          if (data.contactPerson !== undefined) updateData['contactPerson'] = data.contactPerson;
          if (data.phone !== undefined) updateData['phone'] = data.phone;
          if (data.email !== undefined) updateData['email'] = data.email;
          if (data.address !== undefined) updateData['address'] = data.address;
          if (data.notes !== undefined) updateData['notes'] = data.notes;
          if (data.isActive !== undefined) updateData['isActive'] = data.isActive;
          return prisma.supplier.update({
            where: { id },
            data: updateData as Prisma.SupplierUncheckedUpdateInput,
          });
        },
      );
    }),
});
