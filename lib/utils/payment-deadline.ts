/**
 * Batas bayar portal: default **6 jam** sejak `created_at` checkout (WIB).
 * Jika waktu checkout di **Asia/Jakarta** jam **≥ 18:00**, batas = **23:59:59.999** hari kalender yang sama (WIB).
 */
const SIX_H_MS = 6 * 60 * 60 * 1000;

function jakartaYmdParts(utcMs: number): { y: number; m: number; d: number; hour: number } {
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  });
  const parts = dtf.formatToParts(new Date(utcMs));
  const get = (t: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === t)?.value ?? '0');
  return {
    y: get('year'),
    m: get('month'),
    d: get('day'),
    hour: get('hour'),
  };
}

/** Akhir hari kalender Jakarta (23:59:59.999) sebagai UTC epoch ms. */
function endOfJakartaCalendarDayUtcMs(y: number, m: number, d: number): number {
  return Date.UTC(y, m - 1, d, 23 - 7, 59, 59, 999);
}

export function computePortalPaymentExpiryMs(createdAtMs: number): number {
  if (!Number.isFinite(createdAtMs)) {
    return Date.now() + SIX_H_MS;
  }
  const { y, m, d, hour } = jakartaYmdParts(createdAtMs);
  if (hour >= 18) {
    return endOfJakartaCalendarDayUtcMs(y, m, d);
  }
  return createdAtMs + SIX_H_MS;
}

export function computePortalPaymentExpiryIso(createdAtMs: number): string {
  return new Date(computePortalPaymentExpiryMs(createdAtMs)).toISOString();
}
