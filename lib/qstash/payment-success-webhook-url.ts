/**
 * URL webhook WA PAYMENT_SUCCESS untuk `publishJSON` QStash (sama pola checkout).
 */
export function getPaymentSuccessWhatsAppWebhookUrl(): string | null {
  const fromEnv =
    process.env.QSTASH_WEBHOOK_BASE_URL?.trim() || process.env.APP_BASE_URL?.trim() || '';
  if (fromEnv) {
    return `${fromEnv.replace(/\/$/, '')}/api/internal/qstash/payment-success-whatsapp`;
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return `https://${vercel.replace(/^https?:\/\//, '')}/api/internal/qstash/payment-success-whatsapp`;
  }
  return null;
}
