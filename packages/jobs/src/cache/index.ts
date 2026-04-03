import { getRedisConnection } from '../connection.js';

export async function cacheGet(tenantId: string, key: string): Promise<string | null> {
  const redis = getRedisConnection();
  return redis.get(`${tenantId}:${key}`);
}

export async function cacheSet(
  tenantId: string,
  key: string,
  value: string,
  ttlSeconds: number,
): Promise<void> {
  const redis = getRedisConnection();
  await redis.set(`${tenantId}:${key}`, value, 'EX', ttlSeconds);
}

export async function cacheDel(tenantId: string, key: string): Promise<void> {
  const redis = getRedisConnection();
  await redis.del(`${tenantId}:${key}`);
}

export async function cacheGetJson<T>(tenantId: string, key: string): Promise<T | null> {
  const raw = await cacheGet(tenantId, key);
  if (raw === null) {
    return null;
  }
  return JSON.parse(raw) as T;
}

export async function cacheSetJson<T>(
  tenantId: string,
  key: string,
  value: T,
  ttlSeconds: number,
): Promise<void> {
  await cacheSet(tenantId, key, JSON.stringify(value), ttlSeconds);
}
