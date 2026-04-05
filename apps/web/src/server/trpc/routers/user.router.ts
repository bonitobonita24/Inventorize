// User router — tenant-scoped user management (admin only)

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, tenantProcedure, tenantMutationProcedure } from '../trpc';
import { requireRole } from '../middleware/rbac';
import { UserRole } from '@inventorize/shared/enums';
import { prisma } from '@inventorize/db';
import { withTenantContext } from '@inventorize/db';
import type { Prisma } from '@inventorize/db';
import bcrypt from 'bcryptjs';
import { getEmailNotificationsQueue } from '@inventorize/jobs';
import { generateSetupToken, hashSetupToken, getSetupTokenExpiry } from '@/server/lib/setup-token';

export const userRouter = createTRPCRouter({
  list: tenantProcedure
    .use(requireRole(UserRole.ADMIN))
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(200).default(50),
        search: z.string().optional(),
        isActive: z.boolean().optional(),
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
                    { email: { contains: input.search, mode: 'insensitive' as const } },
                  ],
                }
              : {}),
            ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
          };
          const [items, total] = await Promise.all([
            prisma.user.findMany({
              where,
              skip: (input.page - 1) * input.limit,
              take: input.limit,
              orderBy: { name: 'asc' },
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true,
                lastLoginAt: true,
                createdAt: true,
              },
            }),
            prisma.user.count({ where }),
          ]);
          return { items, total, page: input.page, limit: input.limit, totalPages: Math.ceil(total / input.limit) };
        },
      );
    }),

  create: tenantMutationProcedure
    .use(requireRole(UserRole.ADMIN))
    .input(
      z.object({
        name: z.string().min(1).max(200),
        email: z.string().email(),
        role: z.enum(['admin', 'warehouse_staff', 'purchasing_staff']),
      }).strict(),
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.tenantId!;
      const userId = ctx.userId!;
      return withTenantContext(
        { tenantId, userId },
        async () => {
          // Check for duplicate email within tenant
          const existing = await prisma.user.findFirst({
            where: { email: input.email, tenantId },
          });
          if (existing !== null) {
            throw new TRPCError({
              code: 'CONFLICT',
              message: 'A user with this email already exists.',
            });
          }

          // Create user with no password — they set it via setup link
          const user = await prisma.user.create({
            data: {
              tenantId,
              name: input.name,
              email: input.email,
              hashedPassword: '',
              role: input.role,
              isActive: true,
            },
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              isActive: true,
              createdAt: true,
            },
          });

          // Generate setup token and store hash in VerificationToken (24h expiry)
          const rawToken = generateSetupToken();
          const hashedToken = await hashSetupToken(rawToken);
          await prisma.verificationToken.create({
            data: {
              identifier: `setup:${user.email}`,
              token: hashedToken,
              expires: getSetupTokenExpiry(),
            },
          });

          // Enqueue welcome email with setup link (non-blocking)
          const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { name: true, slug: true },
          });
          if (tenant !== null) {
            const baseUrl = process.env['NEXTAUTH_URL'] ?? 'http://localhost:3000';
            const setupUrl = `${baseUrl}/auth/setup?token=${rawToken}&email=${encodeURIComponent(user.email)}`;
            try {
              const queue = getEmailNotificationsQueue();
              await queue.add('welcome-user', {
                tenantId,
                userId: user.id,
                type: 'welcome',
                recipientEmail: user.email,
                recipientName: user.name,
                subject: `Welcome to Inventorize — ${tenant.name}`,
                templateData: {
                  tenantName: tenant.name,
                  loginUrl: setupUrl,
                },
              });
            } catch {
              console.error('[user] Failed to enqueue welcome email for', user.email);
            }
          }

          return user;
        },
      );
    }),

  update: tenantMutationProcedure
    .use(requireRole(UserRole.ADMIN))
    .input(
      z.object({
        id: z.string().cuid(),
        name: z.string().min(1).max(200).optional(),
        email: z.string().email().optional(),
        role: z.enum(['admin', 'warehouse_staff', 'purchasing_staff']).optional(),
        isActive: z.boolean().optional(),
      }).strict(),
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.tenantId!;
      const userId = ctx.userId!;
      return withTenantContext(
        { tenantId, userId },
        async () => {
          // Verify user belongs to this tenant
          const user = await prisma.user.findFirst({
            where: { id: input.id, tenantId },
          });
          if (user === null) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'Resource not found.' });
          }

          // Prevent self-deactivation
          if (input.id === userId && input.isActive === false) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'You cannot deactivate your own account.',
            });
          }

          const { id, ...data } = input;
          const updateData: Record<string, unknown> = {};
          if (data.name !== undefined) updateData['name'] = data.name;
          if (data.email !== undefined) updateData['email'] = data.email;
          if (data.role !== undefined) updateData['role'] = data.role;
          if (data.isActive !== undefined) updateData['isActive'] = data.isActive;
          return prisma.user.update({
            where: { id },
            data: updateData as Prisma.UserUncheckedUpdateInput,
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              isActive: true,
              createdAt: true,
            },
          });
        },
      );
    }),

  resetPassword: tenantMutationProcedure
    .use(requireRole(UserRole.ADMIN))
    .input(
      z.object({
        id: z.string().cuid(),
        newPassword: z.string().min(8).max(128),
      }).strict(),
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.tenantId!;
      const userId = ctx.userId!;
      return withTenantContext(
        { tenantId, userId },
        async () => {
          const user = await prisma.user.findFirst({
            where: { id: input.id, tenantId },
          });
          if (user === null) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'Resource not found.' });
          }

          const hashedPassword = await bcrypt.hash(input.newPassword, 12);
          await prisma.user.update({
            where: { id: input.id },
            data: { hashedPassword },
          });
          return { success: true };
        },
      );
    }),
});
