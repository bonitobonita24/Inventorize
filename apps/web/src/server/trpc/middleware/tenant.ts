// L1 tenant scoping middleware — ensures tenantId present in context

import { TRPCError } from '@trpc/server';
import { initTRPC } from '@trpc/server';
import type { TRPCContext } from '../context';

const t = initTRPC.context<TRPCContext>().create();

export const requireTenant = t.middleware(({ ctx, next }) => {
  if (ctx.tenantId === null) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied.' });
  }

  return next({
    ctx: {
      ...ctx,
      tenantId: ctx.tenantId,
    },
  });
});

// Impersonation guard — blocks mutations when isImpersonating is true
export const blockIfImpersonating = t.middleware(({ ctx, next }) => {
  const session = ctx.session;
  if (session !== null && (session.user as Record<string, unknown>)['isImpersonating'] === true) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Mutations are blocked during impersonation.',
    });
  }
  return next({ ctx });
});
