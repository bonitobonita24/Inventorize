// tRPC context — created for every request, provides session + tenant info

import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import { auth } from '@/server/auth';
import type { UserRole } from '@inventorize/shared/enums';

export interface TRPCContext {
  session: {
    user: {
      id: string;
      name: string;
      email: string;
      role: UserRole;
      tenantId: string | null;
      tenantSlug: string | null;
    };
  } | null;
  userId: string | null;
  tenantId: string | null;
  roles: UserRole[];
  headers: Headers;
}

export async function createTRPCContext(
  opts: FetchCreateContextFnOptions,
): Promise<TRPCContext> {
  const session = await auth();

  const user = session?.user as {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    tenantId: string | null;
    tenantSlug: string | null;
  } | undefined;

  return {
    session: user !== undefined
      ? { user }
      : null,
    userId: user?.id ?? null,
    tenantId: user?.tenantId ?? null,
    roles: user?.role !== undefined ? [user.role] : [],
    headers: opts.req.headers,
  };
}
