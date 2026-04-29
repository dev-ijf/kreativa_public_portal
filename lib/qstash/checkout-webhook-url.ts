/**
 * URL webhook checkout-WA yang dipakai `publishJSON` **dan** verifikasi tanda tangan.
 * Harus identik dengan URL publik yang dipanggil QStash (bukan `request.url` internal Vercel).
 *
 * Prioritas: `QSTASH_WEBHOOK_BASE_URL` → `APP_BASE_URL` → `VERCEL_URL` (https).
 */
export function getCheckoutWhatsAppWebhookUrl(): string | null {
  const fromEnv =
    process.env.QSTASH_WEBHOOK_BASE_URL?.trim() || process.env.APP_BASE_URL?.trim() || '';
  if (fromEnv) {
    return `${fromEnv.replace(/\/$/, '')}/api/internal/qstash/checkout-whatsapp`;
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return `https://${vercel.replace(/^https?:\/\//, '')}/api/internal/qstash/checkout-whatsapp`;
  }
  return null;
}
