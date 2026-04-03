// Next.js middleware — tenant resolution from URL path, auth guard, session-URL cross-check
// Uses getToken() from next-auth/jwt which is Edge Runtime compatible (no Prisma dependency)

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Paths that don't require authentication
const PUBLIC_PATHS = ['/login', '/api/health', '/api/trpc'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow static assets and Next.js internals
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    return NextResponse.next();
  }

  // Decode JWT from cookie — Edge-compatible, no Prisma needed
  const secret = process.env.AUTH_SECRET;
  if (secret === undefined) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  const token = await getToken({ req, secret });

  // Unauthenticated → redirect to login
  if (token === null) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = token.role as string | undefined;
  const tenantSlug = token.tenantSlug as string | null | undefined;

  // Super admin platform routes
  if (pathname.startsWith('/platform')) {
    if (role !== 'SUPER_ADMIN') {
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
    if (tenantSlug !== urlSlug) {
      // Redirect to user's actual tenant
      if (tenantSlug !== null && tenantSlug !== undefined) {
        return NextResponse.redirect(new URL(`/${tenantSlug}/dashboard`, req.url));
      }
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
