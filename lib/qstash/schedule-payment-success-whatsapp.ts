import { processPaymentSuccessWhatsAppJob } from '@/lib/notifications/payment-success-wa';
import type { PaymentSuccessWhatsAppJobBody } from '@/lib/qstash/payment-success-whatsapp-job';
import { getPaymentSuccessWhatsAppWebhookUrl } from '@/lib/qstash/payment-success-webhook-url';

export type { PaymentSuccessWhatsAppJobBody } from '@/lib/qstash/payment-success-whatsapp-job';

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
 * Antre pengiriman WA PAYMENT_SUCCESS lewat Upstash QStash (atau inline di lokal).
 */
export async function schedulePaymentSuccessWhatsAppJob(
  body: PaymentSuccessWhatsAppJobBody,
): Promise<void> {
  const token = process.env.QSTASH_TOKEN?.trim();
  const url = getPaymentSuccessWhatsAppWebhookUrl();

  if (!token || !isPublicUrl(url)) {
    console.info('payment_success_whatsapp: inline (no QStash — dev/local or missing config)');
    void processPaymentSuccessWhatsAppJob(body).catch((err) => {
      console.error('payment_success_whatsapp_inline', err);
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
