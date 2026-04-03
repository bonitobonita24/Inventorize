// Base tRPC initialization — procedures, middleware, error formatting

import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import type { TRPCContext } from './context.js';
import { rateLimiters } from '@/server/lib/rate-limit.js';

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        // Never expose internal error details in production
        stack: process.env['NODE_ENV'] === 'development' ? error.cause?.stack : undefined,
      },
    };
  },
});

export const createCallerFactory = t.createCallerFactory;
export const createTRPCRouter = t.router;
export const mergeRouters = t.mergeRouters;

// Rate-limited public procedure
export const publicProcedure = t.procedure.use(async ({ ctx, next }) => {
  const ip = ctx.headers.get('x-forwarded-for') ?? 'unknown';
  rateLimiters.public.check(ip);
  return next({ ctx });
});

// Auth middleware — rejects unauthenticated requests
const enforceAuth = t.middleware(({ ctx, next }) => {
  if (ctx.session === null) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated.' });
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      userId: ctx.session.user.id,
      tenantId: ctx.session.user.tenantId,
      roles: [ctx.session.user.role],
    },
  });
});

// Rate-limited authenticated procedure
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  const token = ctx.userId ?? ctx.headers.get('x-forwarded-for') ?? 'unknown';
  rateLimiters.api.check(token);
  return next({ ctx });
}).use(enforceAuth);

// Tenant-scoped procedure — requires auth + valid tenantId
const enforceTenant = t.middleware(({ ctx, next }) => {
  if (ctx.tenantId === null) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied.' });
  }
  const tenantId: string = ctx.tenantId;
  return next({
    ctx: {
      ...ctx,
      tenantId,
    },
  });
});

export const tenantProcedure = protectedProcedure.use(enforceTenant);
