// Billing router — subscription plans, tenant subscriptions, payments, refunds
// Plans are platform-level (superadmin managed). Subscriptions/payments/refunds are tenant-scoped.

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import type { Prisma } from '@inventorize/db';
import { createTRPCRouter, protectedProcedure, tenantProcedure, tenantMutationProcedure } from '../trpc';
import { requireRole } from '../middleware/rbac';
import { UserRole } from '@inventorize/shared/enums';
import { platformPrisma, prisma } from '@inventorize/db';
import { createInvoice as xenditCreateInvoice, createRefund as xenditCreateRefund } from '@/server/lib/xendit';

const superAdminProcedure = protectedProcedure.use(requireRole(UserRole.SUPER_ADMIN));

// ─── Platform-level: Subscription Plan management ───────────────────────────

const plansRouter = createTRPCRouter({
  // List all plans — accessible to tenants (read) and superadmin
  list: tenantProcedure
    .input(
      z.object({
        activeOnly: z.boolean().default(true),
      }).strict(),
    )
    .query(async ({ input }) => {
      return platformPrisma.subscriptionPlan.findMany({
        where: input.activeOnly ? { isActive: true } : {},
        orderBy: [{ billingCycle: 'asc' }, { priceAmount: 'asc' }],
      });
    }),

  get: tenantProcedure
    .input(z.object({ id: z.string().cuid() }).strict())
    .query(async ({ input }) => {
      const plan = await platformPrisma.subscriptionPlan.findUnique({
        where: { id: input.id },
      });
      if (plan === null) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Resource not found.' });
      }
      return plan;
    }),

  create: superAdminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        priceAmount: z.number().positive(),
        currency: z.string().length(3).toUpperCase(),
        billingCycle: z.enum(['monthly', 'yearly']),
        description: z.string().max(1000).optional(),
      }).strict(),
    )
    .mutation(async ({ ctx, input }) => {
      const plan = await platformPrisma.subscriptionPlan.create({
        data: {
          name: input.name,
          priceAmount: input.priceAmount,
          currency: input.currency,
          billingCycle: input.billingCycle,
          description: input.description ?? null,
        },
      });

      await platformPrisma.auditLog.create({
        data: {
          tenantId: null,
          actorUserId: ctx.userId!,
          actionType: 'PLATFORM:CREATE_SUBSCRIPTION_PLAN',
          entityType: 'SubscriptionPlan',
          entityId: plan.id,
          afterStateJson: { name: plan.name, priceAmount: plan.priceAmount.toString(), currency: plan.currency, billingCycle: plan.billingCycle },
        },
      });

      return plan;
    }),

  update: superAdminProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        name: z.string().min(1).max(200).optional(),
        description: z.string().max(1000).optional(),
        isActive: z.boolean().optional(),
      }).strict(),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await platformPrisma.subscriptionPlan.findUnique({
        where: { id: input.id },
      });
      if (existing === null) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Resource not found.' });
      }

      const updated = await platformPrisma.subscriptionPlan.update({
        where: { id: input.id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        },
      });

      await platformPrisma.auditLog.create({
        data: {
          tenantId: null,
          actorUserId: ctx.userId!,
          actionType: 'PLATFORM:UPDATE_SUBSCRIPTION_PLAN',
          entityType: 'SubscriptionPlan',
          entityId: input.id,
          beforeStateJson: { name: existing.name, isActive: existing.isActive },
          afterStateJson: { name: updated.name, isActive: updated.isActive },
        },
      });

      return updated;
    }),
});

// ─── Tenant-level: Subscription management ──────────────────────────────────

const subscriptionsRouter = createTRPCRouter({
  // Get the current tenant's active subscription
  getCurrent: tenantProcedure
    .query(async ({ ctx }) => {
      return prisma.tenantSubscription.findFirst({
        where: {
          tenantId: ctx.tenantId,
          status: 'active',
        },
        include: {
          plan: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    }),

  list: tenantProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(200).default(50),
      }).strict(),
    )
    .query(async ({ ctx, input }) => {
      const [items, total] = await Promise.all([
        prisma.tenantSubscription.findMany({
          where: { tenantId: ctx.tenantId },
          include: { plan: true },
          orderBy: { createdAt: 'desc' },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
        }),
        prisma.tenantSubscription.count({ where: { tenantId: ctx.tenantId } }),
      ]);
      return { items, total, page: input.page, limit: input.limit, totalPages: Math.ceil(total / input.limit) };
    }),

  // Initiate a subscription — creates a pending subscription record
  // The Xendit invoice is created separately via billing.xendit.createInvoice
  create: tenantMutationProcedure
    .use(requireRole(UserRole.ADMIN))
    .input(
      z.object({
        planId: z.string().cuid(),
      }).strict(),
    )
    .mutation(async ({ ctx, input }) => {
      const plan = await platformPrisma.subscriptionPlan.findUnique({
        where: { id: input.planId, isActive: true },
      });
      if (plan === null) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Resource not found.' });
      }

      // One active subscription per tenant at a time
      const existing = await prisma.tenantSubscription.findFirst({
        where: { tenantId: ctx.tenantId!, status: 'active' },
        select: { id: true },
      });
      if (existing !== null) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'An active subscription already exists. Cancel it before subscribing to a new plan.',
        });
      }

      return prisma.$transaction(async (tx) => {
        const subscription = await tx.tenantSubscription.create({
          data: {
            tenantId: ctx.tenantId!,
            planId: input.planId,
            status: 'pending',
          },
          include: { plan: true },
        });

        await tx.auditLog.create({
          data: {
            tenantId: ctx.tenantId!,
            actorUserId: ctx.userId!,
            actionType: 'CREATE_SUBSCRIPTION',
            entityType: 'TenantSubscription',
            entityId: subscription.id,
            afterStateJson: { planId: input.planId, planName: plan.name, status: 'pending' },
          },
        });

        return subscription;
      });
    }),
});

// ─── Tenant-level: Payment history ──────────────────────────────────────────

const paymentsRouter = createTRPCRouter({
  list: tenantProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(200).default(50),
        status: z.enum(['pending', 'paid', 'failed', 'refunded']).optional(),
      }).strict(),
    )
    .query(async ({ ctx, input }) => {
      const where: Prisma.PaymentWhereInput = {
        tenantId: ctx.tenantId,
        ...(input.status !== undefined ? { status: input.status } : {}),
      };
      const [items, total] = await Promise.all([
        prisma.payment.findMany({
          where,
          include: { subscription: { include: { plan: true } } },
          orderBy: { createdAt: 'desc' },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
        }),
        prisma.payment.count({ where }),
      ]);
      return { items, total, page: input.page, limit: input.limit, totalPages: Math.ceil(total / input.limit) };
    }),

  get: tenantProcedure
    .input(z.object({ id: z.string().cuid() }).strict())
    .query(async ({ ctx, input }) => {
      const payment = await prisma.payment.findFirst({
        where: { id: input.id, tenantId: ctx.tenantId },
        include: {
          subscription: { include: { plan: true } },
          refunds: true,
        },
      });
      if (payment === null) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Resource not found.' });
      }
      return payment;
    }),
});

// ─── Tenant-level: Refund management ────────────────────────────────────────

const refundsRouter = createTRPCRouter({
  list: tenantProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(200).default(50),
        status: z.enum(['requested', 'approved', 'rejected', 'processed', 'failed']).optional(),
      }).strict(),
    )
    .query(async ({ ctx, input }) => {
      const where: Prisma.RefundWhereInput = {
        tenantId: ctx.tenantId,
        ...(input.status !== undefined ? { status: input.status } : {}),
      };
      const [items, total] = await Promise.all([
        prisma.refund.findMany({
          where,
          include: {
            payment: { include: { subscription: { include: { plan: true } } } },
            requestedByUser: { select: { id: true, name: true, email: true } },
            reviewedByUser: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
        }),
        prisma.refund.count({ where }),
      ]);
      return { items, total, page: input.page, limit: input.limit, totalPages: Math.ceil(total / input.limit) };
    }),

  request: tenantMutationProcedure
    .use(requireRole(UserRole.ADMIN))
    .input(
      z.object({
        paymentId: z.string().cuid(),
        amount: z.number().positive(),
        reason: z.string().min(10).max(1000),
      }).strict(),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify payment belongs to this tenant and is paid
      const payment = await prisma.payment.findFirst({
        where: { id: input.paymentId, tenantId: ctx.tenantId!, status: 'paid' },
      });
      if (payment === null) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Resource not found.' });
      }

      // Validate refund amount does not exceed payment amount
      if (input.amount > Number(payment.amount)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid input.',
        });
      }

      return prisma.$transaction(async (tx) => {
        const refund = await tx.refund.create({
          data: {
            tenantId: ctx.tenantId!,
            paymentId: input.paymentId,
            amount: input.amount,
            currency: payment.currency,
            reason: input.reason,
            status: 'requested',
            requestedByUserId: ctx.userId!,
          },
        });

        await tx.auditLog.create({
          data: {
            tenantId: ctx.tenantId!,
            actorUserId: ctx.userId!,
            actionType: 'REQUEST_REFUND',
            entityType: 'Refund',
            entityId: refund.id,
            afterStateJson: { paymentId: input.paymentId, amount: input.amount, currency: payment.currency, status: 'requested' },
          },
        });

        return refund;
      });
    }),

  // Superadmin: list all refunds across all tenants
  listAll: superAdminProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(200).default(50),
        status: z.enum(['requested', 'approved', 'rejected', 'processed', 'failed']).optional(),
      }).strict(),
    )
    .query(async ({ input }) => {
      const where = input.status !== undefined ? { status: input.status } : {};
      const [items, total] = await Promise.all([
        platformPrisma.refund.findMany({
          where,
          include: {
            payment: { include: { subscription: { include: { plan: true } } } },
            requestedByUser: { select: { id: true, name: true, email: true } },
            reviewedByUser: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
        }),
        platformPrisma.refund.count({ where }),
      ]);
      return { items, total, page: input.page, limit: input.limit, totalPages: Math.ceil(total / input.limit) };
    }),

  // Superadmin: review a refund (approve or reject)
  // On approval: initiates the refund with Xendit and stores xenditRefundId.
  // Xendit then sends XENDIT_REFUND.DONE or XENDIT_REFUND.FAILED webhook to finalise.
  review: superAdminProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        decision: z.enum(['approved', 'rejected']),
      }).strict(),
    )
    .mutation(async ({ ctx, input }) => {
      const refund = await platformPrisma.refund.findUnique({
        where: { id: input.id },
        include: { payment: { select: { xenditInvoiceId: true } } },
      });
      if (refund === null || refund.status !== 'requested') {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Resource not found.' });
      }

      await platformPrisma.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.refund.update({
          where: { id: input.id },
          data: {
            status: input.decision,
            reviewedByUserId: ctx.userId!,
          },
        });

        await tx.auditLog.create({
          data: {
            tenantId: refund.tenantId,
            actorUserId: ctx.userId!,
            actionType: `PLATFORM:${input.decision === 'approved' ? 'APPROVE' : 'REJECT'}_REFUND`,
            entityType: 'Refund',
            entityId: input.id,
            beforeStateJson: { status: 'requested' },
            afterStateJson: { status: input.decision, reviewedByUserId: ctx.userId! },
          },
        });
      });

      // If approved and the payment has a Xendit invoice, call Xendit to initiate the refund.
      // The xenditRefundId is stored so the webhook processor can match XENDIT_REFUND.DONE/FAILED.
      if (input.decision === 'approved' && refund.payment.xenditInvoiceId !== null) {
        const xenditRefund = await xenditCreateRefund({
          invoiceId: refund.payment.xenditInvoiceId,
          amount: Number(refund.amount),
          reason: refund.reason,
        });

        await platformPrisma.refund.update({
          where: { id: input.id },
          data: { xenditRefundId: xenditRefund.id },
        });
      }

      return { id: input.id, status: input.decision };
    }),
});

// ─── Tenant-level: Xendit invoice creation ──────────────────────────────────

const xenditRouter = createTRPCRouter({
  // Create a Xendit invoice for a pending subscription.
  // The tenant is redirected to invoice_url to complete payment.
  // On success, Xendit fires INVOICE.PAID → webhook processor activates the subscription.
  createInvoice: tenantMutationProcedure
    .use(requireRole(UserRole.ADMIN))
    .input(
      z.object({
        subscriptionId: z.string().cuid(),
      }).strict(),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify subscription belongs to this tenant and is awaiting payment
      const subscription = await prisma.tenantSubscription.findFirst({
        where: { id: input.subscriptionId, tenantId: ctx.tenantId!, status: 'pending' },
        include: { plan: true },
      });
      if (subscription === null) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Resource not found.' });
      }

      // Get the requesting user's email for the Xendit invoice payer field
      const user = await platformPrisma.user.findUnique({
        where: { id: ctx.userId! },
        select: { email: true },
      });
      if (user === null) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Something went wrong. Please try again.' });
      }

      // Create a pending Payment record — externalId sent to Xendit for cross-reference
      const payment = await prisma.payment.create({
        data: {
          tenantId: ctx.tenantId!,
          subscriptionId: input.subscriptionId,
          amount: subscription.plan.priceAmount,
          currency: subscription.plan.currency,
          status: 'pending',
        },
      });

      // Call Xendit — returns an invoice URL to redirect the user to
      const invoice = await xenditCreateInvoice({
        externalId: payment.id,
        amount: Number(subscription.plan.priceAmount),
        currency: subscription.plan.currency,
        payerEmail: user.email,
        description: `Subscription to ${subscription.plan.name}`,
      });

      // Persist the Xendit invoice ID on the payment record for webhook matching
      await prisma.payment.update({
        where: { id: payment.id },
        data: { xenditInvoiceId: invoice.id },
      });

      return { invoiceUrl: invoice.invoice_url };
    }),
});

// ─── Compose billing router ──────────────────────────────────────────────────

export const billingRouter = createTRPCRouter({
  plans: plansRouter,
  subscriptions: subscriptionsRouter,
  payments: paymentsRouter,
  refunds: refundsRouter,
  xendit: xenditRouter,
});
