#!/usr/bin/env node
// tools/check-env.mjs
// Validates all required environment variables are set in .env.dev
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

const REQUIRED_VARS = [
  'COMPOSE_PROJECT_NAME',
  'APP_ENV',
  'APP_PORT',
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'DATABASE_URL',
  'PGBOUNCER_PORT',
  'PGBOUNCER_AUTH_PASSWORD',
  'REDIS_HOST',
  'REDIS_PORT',
  'REDIS_PASSWORD',
  'REDIS_URL',
  'STORAGE_ENDPOINT',
  'STORAGE_CONSOLE_PORT',
  'STORAGE_BUCKET',
  'STORAGE_ACCESS_KEY',
  'STORAGE_SECRET_KEY',
  'STORAGE_REGION',
  'AUTH_SECRET',
  'NEXTAUTH_URL',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_FROM',
  'PGADMIN_PORT',
  'PGADMIN_EMAIL',
  'PGADMIN_PASSWORD',
];

try {
  const envPath = resolve(root, '.env.dev');

  if (!existsSync(envPath)) {
    console.error('❌ .env.dev not found. Run Phase 3 to generate environment files.');
    process.exit(1);
  }

  const content = readFileSync(envPath, 'utf-8');
  const lines = content.split('\n').filter((l) => l.trim() && !l.startsWith('#'));
  const defined = new Set(lines.map((l) => l.split('=')[0].trim()));

  const missing = REQUIRED_VARS.filter((v) => !defined.has(v));

  if (missing.length > 0) {
    console.error(`❌ .env.dev missing required variables:\n  ${missing.join('\n  ')}`);
    process.exit(1);
  }

  // Check no placeholder values remain
  const placeholders = lines.filter(
    (l) => l.includes('your-') || l.includes('CHANGE_ME') || l.includes('<generated')
  );
  if (placeholders.length > 0) {
    console.error(`❌ .env.dev contains placeholder values:\n  ${placeholders.join('\n  ')}`);
    process.exit(1);
  }

  console.log(`✅ .env.dev check passed — ${REQUIRED_VARS.length} required vars present`);
  process.exit(0);
} catch (err) {
  console.error(`❌ Check error: ${err.message}`);
  process.exit(1);
}
