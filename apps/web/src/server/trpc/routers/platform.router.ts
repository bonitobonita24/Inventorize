// Platform router — superadmin operations (cross-tenant, no L6 guard)
// Uses platformPrisma — dedicated client WITHOUT tenant-guard extension.

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import type { Prisma } from '@inventorize/db';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { requireRole } from '../middleware/rbac';
import { UserRole } from '@inventorize/shared/enums';
import { platformPrisma } from '@inventorize/db';
import { getEmailNotificationsQueue } from '@inventorize/jobs';
import { generateSetupToken, hashSetupToken, getSetupTokenExpiry } from '@/server/lib/setup-token';

const superAdminProcedure = protectedProcedure.use(requireRole(UserRole.SUPER_ADMIN));

export const platformRouter = createTRPCRouter({
  listTenants: superAdminProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(200).default(50),
        search: z.string().optional(),
        status: z.enum(['active', 'suspended', 'trial']).optional(),
      }).strict(),
    )
    .query(async ({ input }) => {
      const where = {
        ...(input.search !== undefined
          ? {
              OR: [
                { name: { contains: input.search, mode: 'insensitive' as const } },
                { slug: { contains: input.search, mode: 'insensitive' as const } },
              ],
            }
          : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      };
      const [items, total] = await Promise.all([
        platformPrisma.tenant.findMany({
          where,
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          orderBy: { createdAt: 'desc' },
          include: { _count: { select: { users: true, products: true } } },
        }),
        platformPrisma.tenant.count({ where }),
      ]);
      return { items, total, page: input.page, limit: input.limit, totalPages: Math.ceil(total / input.limit) };
    }),

  getTenant: superAdminProcedure
    .input(z.object({ id: z.string().cuid() }).strict())
    .query(async ({ input }) => {
      const tenant = await platformPrisma.tenant.findUnique({
        where: { id: input.id },
        include: {
          _count: {
            select: { users: true, products: true, suppliers: true, purchaseOrders: true },
          },
        },
      });
      if (tenant === null) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Resource not found.' });
      }
      return tenant;
    }),

  checkSlugAvailability: superAdminProcedure
    .input(z.object({ slug: z.string().min(1).max(60) }).strict())
    .query(async ({ input }) => {
      const existing = await platformPrisma.tenant.findUnique({
        where: { slug: input.slug },
        select: { id: true },
      });
      return { available: existing === null };
    }),

  createTenant: superAdminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        slug: z.string().min(1).max(60).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens'),
        contactEmail: z.string().email(),
      }).strict(),
    )
    .mutation(async ({ ctx, input }) => {
      // Check slug uniqueness
      const existing = await platformPrisma.tenant.findUnique({
        where: { slug: input.slug },
        select: { id: true },
      });
      if (existing !== null) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'A tenant with this slug already exists.',
        });
      }

      // Atomic: tenant + audit log in one transaction
      return platformPrisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const tenant = await tx.tenant.create({
          data: {
            name: input.name,
            slug: input.slug,
            contactEmail: input.contactEmail,
            status: 'active',
          },
        });

        await tx.auditLog.create({
          data: {
            tenantId: tenant.id,
            actorUserId: ctx.userId!,
            actionType: 'PLATFORM:CREATE_TENANT',
            entityType: 'Tenant',
            entityId: tenant.id,
            afterStateJson: { name: tenant.name, slug: tenant.slug, contactEmail: input.contactEmail },
          },
        });

        return tenant;
      });
    }),

  createTenantAdmin: superAdminProcedure
    .input(
      z.object({
        tenantId: z.string().cuid(),
        name: z.string().min(1).max(200),
        email: z.string().email(),
      }).strict(),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify tenant exists
      const tenant = await platformPrisma.tenant.findUnique({
        where: { id: input.tenantId },
        select: { id: true, name: true, slug: true },
      });
      if (tenant === null) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Resource not found.' });
      }

      // Check for duplicate email globally (users table is global)
      const existingUser = await platformPrisma.user.findFirst({
        where: { email: input.email },
        select: { id: true },
      });
      if (existingUser !== null) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'A user with this email already exists.',
        });
      }

      // Create user with no password — they set it via setup link
      const user = await platformPrisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const created = await tx.user.create({
          data: {
            tenantId: input.tenantId,
            name: input.name,
            email: input.email,
            hashedPassword: '',
            role: 'admin',
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

        await tx.auditLog.create({
          data: {
            tenantId: input.tenantId,
            actorUserId: ctx.userId!,
            actionType: 'PLATFORM:CREATE_TENANT_ADMIN',
            entityType: 'User',
            entityId: created.id,
            afterStateJson: { name: created.name, email: created.email, role: 'admin', tenantId: input.tenantId },
          },
        });

        return created;
      });

      // Generate setup token and store hash in VerificationToken (24h expiry)
      const rawToken = generateSetupToken();
      const hashedToken = await hashSetupToken(rawToken);
      await platformPrisma.verificationToken.create({
        data: {
          identifier: `setup:${user.email}`,
          token: hashedToken,
          expires: getSetupTokenExpiry(),
        },
      });

      // Enqueue welcome email with setup link (outside transaction — non-blocking)
      const baseUrl = process.env['NEXTAUTH_URL'] ?? 'http://localhost:3000';
      const setupUrl = `${baseUrl}/auth/setup?token=${rawToken}&email=${encodeURIComponent(user.email)}`;
      try {
        const queue = getEmailNotificationsQueue();
        await queue.add('welcome-tenant-admin', {
          tenantId: input.tenantId,
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
        // Non-blocking — email failure should not block tenant admin creation
        console.error('[platform] Failed to enqueue welcome email for', user.email);
      }

      return user;
    }),

  updateTenantStatus: superAdminProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        status: z.enum(['active', 'suspended', 'trial']),
      }).strict(),
    )
    .mutation(async ({ ctx, input }) => {
      const tenant = await platformPrisma.tenant.findUnique({ where: { id: input.id } });
      if (tenant === null) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Resource not found.' });
      }

      // Atomic: status update + audit log in one transaction
      return platformPrisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const updated = await tx.tenant.update({
          where: { id: input.id },
          data: { status: input.status },
        });

        await tx.auditLog.create({
          data: {
            tenantId: input.id,
            actorUserId: ctx.userId!,
            actionType: 'PLATFORM:UPDATE_TENANT_STATUS',
            entityType: 'Tenant',
            entityId: input.id,
            beforeStateJson: { status: tenant.status },
            afterStateJson: { status: input.status },
          },
        });

        return updated;
      });
    }),

  platformMetrics: superAdminProcedure
    .query(async () => {
      const [totalTenants, activeTenants, totalUsers, totalProducts, tenantUserBreakdown] = await Promise.all([
        platformPrisma.tenant.count(),
        platformPrisma.tenant.count({ where: { status: 'active' } }),
        platformPrisma.user.count(),
        platformPrisma.product.count(),
        platformPrisma.tenant.findMany({
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            _count: { select: { users: { where: { isActive: true } } } },
          },
          orderBy: { name: 'asc' },
        }),
      ]);
      return {
        totalTenants,
        activeTenants,
        totalUsers,
        totalProducts,
        tenantUserBreakdown: tenantUserBreakdown.map((t: typeof tenantUserBreakdown[number]) => ({
          id: t.id,
          name: t.name,
          slug: t.slug,
          status: t.status,
          activeUsers: t._count.users,
        })),
      };
    }),

  // Start impersonation — super_admin enters a tenant in read-only mode
  startImpersonation: superAdminProcedure
    .input(z.object({ tenantId: z.string().cuid() }).strict())
    .mutation(async ({ ctx, input }) => {
      const tenant = await platformPrisma.tenant.findUnique({
        where: { id: input.tenantId },
        select: { id: true, name: true, slug: true, status: true },
      });
      if (tenant === null) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Resource not found.' });
      }

      await platformPrisma.auditLog.create({
        data: {
          tenantId: tenant.id,
          actorUserId: ctx.userId!,
          actionType: 'PLATFORM:START_IMPERSONATION',
          entityType: 'Tenant',
          entityId: tenant.id,
          afterStateJson: { tenantName: tenant.name, tenantSlug: tenant.slug },
        },
      });

      return {
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        tenantName: tenant.name,
        originalTenantId: ctx.tenantId,
        originalTenantSlug: ctx.session?.user.tenantSlug ?? null,
      };
    }),

  // Stop impersonation — return to super_admin's own context
  stopImpersonation: superAdminProcedure
    .mutation(async ({ ctx }) => {
      // Log exit from impersonation
      const impersonatedTenantId = ctx.tenantId;
      if (impersonatedTenantId !== null) {
        await platformPrisma.auditLog.create({
          data: {
            tenantId: impersonatedTenantId,
            actorUserId: ctx.userId!,
            actionType: 'PLATFORM:STOP_IMPERSONATION',
            entityType: 'Tenant',
            entityId: impersonatedTenantId,
          },
        });
      }

      return { success: true };
    }),

  platformAuditLogs: superAdminProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(200).default(50),
        actionType: z.string().optional(),
      }).strict(),
    )
    .query(async ({ input }) => {
      const where = {
        actionType: { startsWith: 'PLATFORM:' },
        ...(input.actionType !== undefined ? { actionType: input.actionType } : {}),
      };
      const [items, total] = await Promise.all([
        platformPrisma.auditLog.findMany({
          where,
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          orderBy: { createdAt: 'desc' },
          include: {
            actorUser: { select: { name: true, email: true } },
            tenant: { select: { name: true, slug: true } },
          },
        }),
        platformPrisma.auditLog.count({ where }),
      ]);
      return { items, total, page: input.page, limit: input.limit, totalPages: Math.ceil(total / input.limit) };
    }),
});
