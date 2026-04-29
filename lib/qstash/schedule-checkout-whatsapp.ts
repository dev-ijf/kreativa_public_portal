import { processCheckoutWhatsAppJob } from '@/lib/notifications/checkout-wa';
import type { CheckoutWhatsAppJobBody } from '@/lib/qstash/checkout-whatsapp-job';

export type { CheckoutWhatsAppJobBody } from '@/lib/qstash/checkout-whatsapp-job';

function appBaseUrl(): string | null {
  const explicit = process.env.APP_BASE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, '')}`;
  return null;
}

/**
 * Antre pengiriman WA checkout lewat Upstash QStash.
 * Tanpa QSTASH_TOKEN / URL publik: fallback proses in-process (fire-and-forget).
 */
export async function scheduleCheckoutWhatsAppJob(body: CheckoutWhatsAppJobBody): Promise<void> {
  const token = process.env.QSTASH_TOKEN?.trim();
  const base = appBaseUrl();
  if (!token || !base) {
    void processCheckoutWhatsAppJob(body).catch((err) => {
      console.error('checkout_whatsapp_inline', err);
    });
    return;
  }

  const { Client } = await import('@upstash/qstash');
  const client = new Client({ token });
  const url = `${base}/api/internal/qstash/checkout-whatsapp`;
  await client.publishJSON({
    url,
    body,
    retries: 3,
  });
}
