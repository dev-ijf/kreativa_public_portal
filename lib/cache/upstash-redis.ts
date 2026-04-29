import { Redis } from '@upstash/redis';

const CACHE_TTL_SEC = 600;

let client: Redis | null | undefined;

function getRedis(): Redis | null {
  if (client === undefined) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) {
      client = null;
    } else {
      client = new Redis({ url, token });
    }
  }
  return client;
}

export async function cacheGetJson<T>(key: string): Promise<T | null> {
  const r = getRedis();
  if (!r) return null;
  try {
    const raw = await r.get(key);
    if (raw == null || raw === '') return null;
    if (typeof raw !== 'string') return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSetJson(key: string, value: unknown): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    await r.set(key, JSON.stringify(value), { ex: CACHE_TTL_SEC });
  } catch {
    /* cache best-effort */
  }
}
