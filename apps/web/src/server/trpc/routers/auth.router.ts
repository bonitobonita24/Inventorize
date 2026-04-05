// Auth router — unauthenticated procedures for setup token flow

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, publicProcedure } from '../trpc';
import { prisma } from '@inventorize/db';
import bcrypt from 'bcryptjs';

export const authRouter = createTRPCRouter({
  /**
   * Validates a setup token without consuming it.
   * Returns the user's name for display on the setup page.
   */
  validateSetupToken: publicProcedure
    .input(
      z.object({
        token: z.string().min(1),
        email: z.string().email(),
      }).strict(),
    )
    .query(async ({ input }) => {
      const record = await prisma.verificationToken.findFirst({
        where: { identifier: `setup:${input.email}` },
      });

      if (record === null || record.expires < new Date()) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This setup link is invalid or has expired.',
        });
      }

      const valid = await bcrypt.compare(input.token, record.token);
      if (!valid) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This setup link is invalid or has expired.',
        });
      }

      const user = await prisma.user.findFirst({
        where: { email: input.email },
        select: { name: true },
      });

      return { name: user?.name ?? 'there' };
    }),

  /**
   * Completes account setup: validates token, sets password, invalidates token.
   * The client signs in after this call succeeds.
   */
  completeSetup: publicProcedure
    .input(
      z.object({
        token: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(8).max(128),
      }).strict(),
    )
    .mutation(async ({ input }) => {
      const record = await prisma.verificationToken.findFirst({
        where: { identifier: `setup:${input.email}` },
      });

      if (record === null || record.expires < new Date()) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This setup link is invalid or has expired.',
        });
      }

      const valid = await bcrypt.compare(input.token, record.token);
      if (!valid) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This setup link is invalid or has expired.',
        });
      }

      const user = await prisma.user.findFirst({
        where: { email: input.email },
        select: { id: true },
      });
      if (user === null) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Resource not found.' });
      }

      const hashedPassword = await bcrypt.hash(input.password, 12);

      // Atomic: set password + delete setup token
      await prisma.$transaction([
        prisma.user.update({
          where: { id: user.id },
          data: { hashedPassword },
        }),
        prisma.verificationToken.delete({
          where: { identifier_token: { identifier: `setup:${input.email}`, token: record.token } },
        }),
      ]);

      return { success: true };
    }),
});
