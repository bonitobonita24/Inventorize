// Auth.js v5 configuration — credentials provider with PostgreSQL session storage
// Sessions stored in PostgreSQL via Prisma adapter (white-label, zero external auth service)

import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { platformPrisma } from '@inventorize/db';
import type { UserRole } from '@inventorize/shared/enums';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (typeof credentials?.email !== 'string' || typeof credentials?.password !== 'string') {
          return null;
        }

        const user = await platformPrisma.user.findFirst({
          where: { email: credentials.email, isActive: true },
          include: { tenant: true },
        });

        if (user === null) {
          return null;
        }

        const isValid = await compare(credentials.password, user.hashedPassword);
        if (!isValid) {
          return null;
        }

        // Update last login
        await platformPrisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role as UserRole,
          tenantId: user.tenantId,
          tenantSlug: user.tenant?.slug ?? null,
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
    jwt({ token, user }) {
      if (user !== undefined && user !== null) {
        token.userId = user.id;
        token.role = (user as unknown as Record<string, unknown>)['role'] as string;
        token.tenantId = (user as unknown as Record<string, unknown>)['tenantId'] as string | null;
        token.tenantSlug = (user as unknown as Record<string, unknown>)['tenantSlug'] as string | null;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user !== undefined && session.user !== null) {
        session.user.id = token.userId as string;
        (session.user as unknown as Record<string, unknown>)['role'] = token.role;
        (session.user as unknown as Record<string, unknown>)['tenantId'] = token.tenantId;
        (session.user as unknown as Record<string, unknown>)['tenantSlug'] = token.tenantSlug;
      }
      return session;
    },
  },
});
