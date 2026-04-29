import { processCheckoutWhatsAppJob } from '@/lib/notifications/checkout-wa';
import type { CheckoutWhatsAppJobBody } from '@/lib/qstash/checkout-whatsapp-job';
import { getCheckoutWhatsAppWebhookUrl } from '@/lib/qstash/checkout-webhook-url';

export type { CheckoutWhatsAppJobBody } from '@/lib/qstash/checkout-whatsapp-job';

function isPublicUrl(u: string | null): boolean {
  if (!u) return false;
  try {
    const h = new URL(u).hostname;
    return h !== 'localhost' && h !== '127.0.0.1' && h !== '::1';
  } catch {
    return false;
  }
}

/**
 * Antre pengiriman WA checkout lewat Upstash QStash.
 *
 * **Produksi** (URL publik + QSTASH_TOKEN): publish via QStash → webhook.
 * **Dev lokal** (localhost / tanpa token): langsung proses in-process (fire-and-forget),
 * sehingga tidak ada masalah tanda tangan QStash.
 */
export async function scheduleCheckoutWhatsAppJob(body: CheckoutWhatsAppJobBody): Promise<void> {
  const token = process.env.QSTASH_TOKEN?.trim();
  const url = getCheckoutWhatsAppWebhookUrl();

  if (!token || !isPublicUrl(url)) {
    console.info('checkout_whatsapp: inline (no QStash — dev/local or missing config)');
    void processCheckoutWhatsAppJob(body).catch((err) => {
      console.error('checkout_whatsapp_inline', err);
    });
    return;
  }

  const { Client } = await import('@upstash/qstash');
  const client = new Client({ token });
  await client.publishJSON({
    url: url!,
    body,
    retries: 3,
  });
}
