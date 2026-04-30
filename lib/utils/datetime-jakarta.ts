const TZ_JAKARTA = 'Asia/Jakarta';

/** Akhir string punya offset zona atau Z (UTC). */
function hasExplicitTimeZone(s: string): boolean {
  return /[zZ]$/.test(s) || /[+-]\d{2}:\d{2}$/.test(s) || /[+-]\d{4}$/.test(s);
}

/**
 * Parse timestamp dari Neon Postgres (HTTP driver) untuk ditampilkan sebagai WIB.
 * Neon `timestamp without time zone` + `now()` menyimpan waktu **UTC**.
 * String naif tanpa Z/offset di-tag sebagai UTC (`Z`), lalu `formatDateTimeAsiaJakarta`
 * mengkonversi ke Asia/Jakarta saat render.
 */
export function parsePortalDbTimestamp(s: unknown): Date {
  if (s == null) return new Date(NaN);
  if (s instanceof Date) return s;
  if (typeof s === 'number') return new Date(s);
  const raw = String(s);
  const t = raw.trim();
  if (!t) return new Date(NaN);
  if (hasExplicitTimeZone(t)) return new Date(t);
  const isoLike = t.includes('T') ? t : t.replace(' ', 'T');
  return new Date(`${isoLike}Z`);
}

/** Untuk JSON API: satu bentuk string (`…Z`) agar klien tidak parse string locale dari `String(Date)`. */
export function portalDbTimestampToIsoUtc(v: unknown): string {
  const d = parsePortalDbTimestamp(v);
  return Number.isFinite(d.getTime()) ? d.toISOString() : '';
}

export function formatDateTimeAsiaJakarta(iso: unknown, lang: 'en' | 'id'): string {
  if (iso == null) return '—';
  const d = parsePortalDbTimestamp(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 16);
  return d.toLocaleString(lang === 'en' ? 'en-GB' : 'id-ID', {
    timeZone: TZ_JAKARTA,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/** Hanya tanggal (mis. `YYYY-MM-DD` dari server) dalam kalender Jakarta. */
export function formatDateAsiaJakarta(iso: unknown, lang: 'en' | 'id'): string {
  if (iso == null) return '—';
  const raw = String(iso);
  const t = raw.trim();
  if (!t) return '—';
  const d =
    t.length <= 10 && /^\d{4}-\d{2}-\d{2}$/.test(t)
      ? parsePortalDbTimestamp(`${t}T12:00:00`)
      : parsePortalDbTimestamp(t);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString(lang === 'en' ? 'en-GB' : 'id-ID', {
    timeZone: TZ_JAKARTA,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
