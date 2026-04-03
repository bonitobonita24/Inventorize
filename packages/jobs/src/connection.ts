import { Redis } from 'ioredis';

export interface RedisConfig {
  host: string;
  port: number;
  password: string;
}

let sharedConnection: Redis | null = null;

export function getRedisConfig(): RedisConfig {
  const host = process.env['REDIS_HOST'];
  const portStr = process.env['REDIS_PORT'];
  const password = process.env['REDIS_PASSWORD'];

  if (host === undefined || host === '') {
    throw new Error('REDIS_HOST environment variable is required');
  }
  if (portStr === undefined || portStr === '') {
    throw new Error('REDIS_PORT environment variable is required');
  }
  if (password === undefined || password === '') {
    throw new Error('REDIS_PASSWORD environment variable is required');
  }

  return {
    host,
    port: Number.parseInt(portStr, 10),
    password,
  };
}

export function getRedisConnection(): Redis {
  if (sharedConnection !== null) {
    return sharedConnection;
  }

  const config = getRedisConfig();
  sharedConnection = new Redis({
    host: config.host,
    port: config.port,
    password: config.password,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

  return sharedConnection;
}

export async function closeRedisConnection(): Promise<void> {
  if (sharedConnection !== null) {
    await sharedConnection.quit();
    sharedConnection = null;
  }
}
