// L3 RBAC middleware — role-based access control on every endpoint

import { TRPCError } from '@trpc/server';
import { initTRPC } from '@trpc/server';
import type { TRPCContext } from '../context.js';
import { type UserRole } from '@inventorize/shared/enums';

const t = initTRPC.context<TRPCContext>().create();

export const requireRole = (...allowedRoles: UserRole[]) =>
  t.middleware(({ ctx, next }) => {
    if (ctx.session === null) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated.' });
    }

    const userRole = ctx.session.user.role;
    const hasRole = allowedRoles.includes(userRole);
    if (!hasRole) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied.' });
    }

    return next({ ctx });
  });
