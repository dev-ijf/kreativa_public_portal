import { Redis } from '@upstash/redis';

/**
 * Cache JSON tanpa TTL (persist sampai dihapus).
 * Penghapusan massal: `FLUSHALL` / `FLUSHDB` dari sistem lain, atau `DEL` per key.
 */

let client: Redis | null | undefined;

function getRedis(): Redis | null {
  if (client === undefined) {
    const url =
      process.env.UPSTASH_REDIS_REST_URL?.trim() ||
      process.env.KV_REST_API_URL?.trim();
    const token =
      process.env.UPSTASH_REDIS_REST_TOKEN?.trim() ||
      process.env.KV_REST_API_TOKEN?.trim();
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
    // @upstash/redis auto-deserializes JSON — raw bisa sudah jadi object/array
    if (typeof raw === 'string') return JSON.parse(raw) as T;
    return raw as T;
  } catch {
    return null;
  }
}

export async function cacheSetJson(key: string, value: unknown): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    await r.set(key, JSON.stringify(value));
  } catch {
    /* cache best-effort */
  }
}

/** Diagnostik: cek koneksi Redis, PING, test SET/GET/DEL round-trip. */
export async function redisDiagnostic(): Promise<Record<string, unknown>> {
  const urlSource = process.env.UPSTASH_REDIS_REST_URL?.trim()
    ? 'UPSTASH_REDIS_REST_URL'
    : process.env.KV_REST_API_URL?.trim()
      ? 'KV_REST_API_URL'
      : null;
  const tokenSource = process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
    ? 'UPSTASH_REDIS_REST_TOKEN'
    : process.env.KV_REST_API_TOKEN?.trim()
      ? 'KV_REST_API_TOKEN'
      : null;

  const r = getRedis();
  if (!r) {
    return { connected: false, urlSource, tokenSource, error: 'client is null — no url/token found' };
  }

  const testKey = '__diag_test__';
  try {
    const t0 = Date.now();
    const pong = await r.ping();
    const pingMs = Date.now() - t0;

    const t1 = Date.now();
    await r.set(testKey, '"hello"');
    const setMs = Date.now() - t1;

    const t2 = Date.now();
    const val = await r.get(testKey);
    const getMs = Date.now() - t2;

    await r.del(testKey);

    return {
      connected: true,
      urlSource,
      tokenSource,
      pong,
      pingMs,
      setMs,
      getMs,
      getResult: val,
      getResultType: typeof val,
    };
  } catch (e) {
    return {
      connected: false,
      urlSource,
      tokenSource,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
