// Auth.js v5 configuration — credentials provider with PostgreSQL session storage
// Sessions stored in PostgreSQL via Prisma adapter (white-label, zero external auth service)

import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { platformPrisma } from '@inventorize/db';
import type { UserRole } from '@inventorize/shared/enums';
import { verifyTurnstileToken } from '@/server/lib/turnstile';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        turnstileToken: { label: 'Turnstile Token', type: 'text' },
      },
      async authorize(credentials) {
        if (typeof credentials?.email !== 'string' || typeof credentials?.password !== 'string') {
          return null;
        }

        // V28 bot protection: verify Turnstile token before any DB lookup
        // Generic failure message — do not reveal whether Turnstile or credentials failed
        const turnstileToken = credentials.turnstileToken;
        if (typeof turnstileToken !== 'string' || turnstileToken === '') {
          return null;
        }
        const turnstileOk = await verifyTurnstileToken(turnstileToken);
        if (!turnstileOk) {
          return null;
        }

        const user = await platformPrisma.user.findFirst({
          where: { email: credentials.email, isActive: true },
          include: { tenant: true },
        });

        if (user === null) {
          return null;
        }

        // Block login for users in suspended tenants
        if (user.tenant !== null && user.tenant.status === 'suspended') {
          return null;
        }

        const isValid = await compare(credentials.password, user.hashedPassword);
        if (!isValid) {
          return null;
        }

        // Update last login + write audit event atomically
        await platformPrisma.$transaction([
          platformPrisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          }),
          platformPrisma.auditLog.create({
            data: {
              tenantId: user.tenantId,
              actorUserId: user.id,
              actionType: 'LOGIN',
              entityType: 'User',
              entityId: user.id,
            },
          }),
        ]);

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role as UserRole,
          tenantId: user.tenantId,
          tenantSlug: user.tenant?.slug ?? null,
          securityVersion: user.securityVersion,
        };
      },
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours
  },
  trustHost: true,
  callbacks: {
    async jwt({ token, user, trigger, session: updatedSession }) {
      if (user !== undefined && user !== null) {
        // First sign-in — store all fields including securityVersion for stale-session detection
        const u = user as unknown as Record<string, unknown>;
        token.userId = user.id;
        token.role = u['role'] as string;
        token.tenantId = u['tenantId'] as string | null;
        token.tenantSlug = u['tenantSlug'] as string | null;
        token.isImpersonating = false;
        token.originalTenantId = null;
        token.originalTenantSlug = null;
        token.securityVersion = u['securityVersion'] as number;
      } else if (typeof token.userId === 'string') {
        // Subsequent calls — validate securityVersion against DB (V28: force re-auth on role/tenant/status change)
        const currentUser = await platformPrisma.user.findUnique({
          where: { id: token.userId },
          select: { securityVersion: true, isActive: true },
        });
        // User deactivated or securityVersion incremented → invalidate session
        if (
          currentUser === null ||
          !currentUser.isActive ||
          currentUser.securityVersion !== (token.securityVersion as number)
        ) {
          return null;
        }
      }
      // Allow session update via update() call (used by impersonation start/stop)
      if (trigger === 'update' && updatedSession !== undefined && updatedSession !== null) {
        const s = updatedSession as Record<string, unknown>;
        if (s['isImpersonating'] !== undefined) {
          token.isImpersonating = s['isImpersonating'] as boolean;
          token.tenantId = s['tenantId'] as string | null;
          token.tenantSlug = s['tenantSlug'] as string | null;
          token.originalTenantId = s['originalTenantId'] as string | null;
          token.originalTenantSlug = s['originalTenantSlug'] as string | null;
        }
      }
      return token;
    },
    session({ session, token }) {
      if (session.user !== undefined && session.user !== null) {
        session.user.id = token.userId as string;
        (session.user as unknown as Record<string, unknown>)['role'] = token.role;
        (session.user as unknown as Record<string, unknown>)['tenantId'] = token.tenantId;
        (session.user as unknown as Record<string, unknown>)['tenantSlug'] = token.tenantSlug;
        (session.user as unknown as Record<string, unknown>)['isImpersonating'] = token.isImpersonating ?? false;
        (session.user as unknown as Record<string, unknown>)['originalTenantId'] = token.originalTenantId ?? null;
        (session.user as unknown as Record<string, unknown>)['originalTenantSlug'] = token.originalTenantSlug ?? null;
      }
      return session;
    },
  },
});
