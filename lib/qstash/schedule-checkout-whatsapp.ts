import { processCheckoutWhatsAppJob } from '@/lib/notifications/checkout-wa';
import type { CheckoutWhatsAppJobBody } from '@/lib/qstash/checkout-whatsapp-job';
import { getCheckoutWhatsAppWebhookUrl } from '@/lib/qstash/checkout-webhook-url';

export type { CheckoutWhatsAppJobBody } from '@/lib/qstash/checkout-whatsapp-job';

/**
 * Antre pengiriman WA checkout lewat Upstash QStash.
 * Tanpa QSTASH_TOKEN / URL publik: fallback proses in-process (fire-and-forget).
 */
export async function scheduleCheckoutWhatsAppJob(body: CheckoutWhatsAppJobBody): Promise<void> {
  const token = process.env.QSTASH_TOKEN?.trim();
  const url = getCheckoutWhatsAppWebhookUrl();
  if (!token || !url) {
    void processCheckoutWhatsAppJob(body).catch((err) => {
      console.error('checkout_whatsapp_inline', err);
    });
    return;
  }

  const { Client } = await import('@upstash/qstash');
  const client = new Client({ token });
  await client.publishJSON({
    url,
    body,
    retries: 3,
  });
}
