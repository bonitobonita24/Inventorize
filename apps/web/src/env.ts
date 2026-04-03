// Environment variable validation — fails fast at startup if any required var is missing
import { z } from 'zod';

const envSchema = z.object({
  // App
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  APP_PORT: z.coerce.number().default(44884),

  // Database
  DATABASE_URL: z.string().url(),

  // Auth
  AUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url(),

  // Cache / Queue
  REDIS_HOST: z.string().min(1),
  REDIS_PORT: z.coerce.number(),
  REDIS_PASSWORD: z.string().min(1),

  // Storage
  STORAGE_ENDPOINT: z.string().url(),
  STORAGE_ACCESS_KEY: z.string().min(1),
  STORAGE_SECRET_KEY: z.string().min(1),
  STORAGE_BUCKET: z.string().min(1),
  STORAGE_REGION: z.string().default('us-east-1'),

  // Email
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number(),
  SMTP_FROM: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const formatted = result.error.flatten().fieldErrors;
    const missing = Object.entries(formatted)
      .map(([key, errors]) => `  ${key}: ${(errors ?? []).join(', ')}`)
      .join('\n');
    throw new Error(`Missing or invalid environment variables:\n${missing}`);
  }
  return result.data;
}

export const env = validateEnv();
