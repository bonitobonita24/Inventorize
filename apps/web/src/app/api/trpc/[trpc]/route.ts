// tRPC API route handler — Next.js App Router integration
// Non-tRPC: manual auth not required — tRPC middleware handles auth/tenant/RBAC

import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/server/trpc/router';
import { createTRPCContext } from '@/server/trpc/context';

function handler(req: Request) {
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: (opts) => createTRPCContext(opts),
  });
}

export { handler as GET, handler as POST };
