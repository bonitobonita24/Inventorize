// Next.js middleware — tenant resolution from URL path, auth guard, session-URL cross-check

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/server/auth/index.js';

// Paths that don't require authentication
const PUBLIC_PATHS = ['/login', '/api/health', '/api/trpc'];

export default auth((req: NextRequest & { auth: unknown }) => {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow static assets and Next.js internals
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    return NextResponse.next();
  }

  const session = req.auth as {
    user?: { id: string; tenantId: string | null; tenantSlug: string | null; role: string };
  } | null;

  // Unauthenticated → redirect to login
  if (session?.user === undefined) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Super admin platform routes
  if (pathname.startsWith('/platform')) {
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    return NextResponse.next();
  }

  // Tenant-scoped routes: /[tenantSlug]/...
  const slugMatch = pathname.match(/^\/([^/]+)/);
  if (slugMatch !== null) {
    const urlSlug = slugMatch[1];

    // Cross-check: session tenantSlug must match URL slug
    // Prevents tenant-switching attack (user types /other-tenant/... in URL bar)
    if (session.user.tenantSlug !== urlSlug) {
      // Redirect to user's actual tenant
      if (session.user.tenantSlug !== null) {
        return NextResponse.redirect(new URL(`/${session.user.tenantSlug}/dashboard`, req.url));
      }
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
