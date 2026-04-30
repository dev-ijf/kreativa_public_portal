import { Redis } from '@upstash/redis';
import { sql } from '@/lib/db/client';

export type ClaimResult = 'claimed' | 'duplicate' | 'error';

const KEY_PREFIX = 'bmi_va_dedup:';

function buildKey(vaNo: string, refNo: string, trxDate: string): string {
  return `${KEY_PREFIX}${vaNo}:${refNo}:${trxDate}`;
}

let redis: Redis | null | undefined;

function getRedis(): Redis | null {
  if (redis === undefined) {
    const url =
      process.env.UPSTASH_REDIS_REST_URL?.trim() ||
      process.env.KV_REST_API_URL?.trim();
    const token =
      process.env.UPSTASH_REDIS_REST_TOKEN?.trim() ||
      process.env.KV_REST_API_TOKEN?.trim();
    if (!url || !token) {
      redis = null;
    } else {
      redis = new Redis({ url, token });
    }
  }
  return redis;
}

/**
 * Cek Redis terlebih dahulu (cepat). Jika key sudah ada → duplikat.
 * Jika belum ada, coba claim di Postgres (sumber kebenaran persisten).
 * Jika Postgres claim sukses, set key di Redis (permanent, tanpa TTL).
 *
 * Tabel Postgres: `sql/add_bmi_va_h2h_payment_keys.sql`.
 */
export async function tryClaimBmiPaymentKey(
  vaNo: string,
  refNo: string,
  trxDate: string,
): Promise<ClaimResult> {
  const rKey = buildKey(vaNo, refNo, trxDate);
  const r = getRedis();

  if (r) {
    try {
      const exists = await r.exists(rKey);
      if (exists) {
        console.info('bmi_va_dedup_redis_hit', { vaNo, refNo, trxDate });
        return 'duplicate';
      }
    } catch (e) {
      console.warn('bmi_va_dedup_redis_check_fail', e);
    }
  }

  try {
    const rows = (await sql`
      INSERT INTO public.bmi_va_h2h_payment_keys (va_no, ref_no, trx_date)
      VALUES (${vaNo}, ${refNo}, ${trxDate})
      ON CONFLICT (va_no, ref_no, trx_date) DO NOTHING
      RETURNING va_no
    `) as unknown as { va_no: string }[];

    if (rows.length === 0) {
      if (r) {
        void r.set(rKey, '1').catch(() => {});
      }
      return 'duplicate';
    }
  } catch (e) {
    console.error('bmi_va_dedup_pg_insert', e);
    return 'error';
  }

  if (r) {
    void r.set(rKey, '1').catch((e) => {
      console.warn('bmi_va_dedup_redis_set_fail', e);
    });
  }

  return 'claimed';
}

/**
 * Lepas klaim jika payment gagal diproses (agar bisa di-retry oleh BMI).
 * Hapus dari Postgres dan Redis.
 */
export async function releaseBmiPaymentKey(
  vaNo: string,
  refNo: string,
  trxDate: string,
): Promise<void> {
  const rKey = buildKey(vaNo, refNo, trxDate);
  const r = getRedis();

  try {
    await sql`
      DELETE FROM public.bmi_va_h2h_payment_keys
      WHERE va_no = ${vaNo} AND ref_no = ${refNo} AND trx_date = ${trxDate}
    `;
  } catch {
    /* best-effort */
  }

  if (r) {
    void r.del(rKey).catch(() => {});
  }
}
