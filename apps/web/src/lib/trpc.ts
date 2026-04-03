// Client-side tRPC hooks — React Query integration

'use client';

import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@/server/trpc/router.js';

export const trpc = createTRPCReact<AppRouter>();
