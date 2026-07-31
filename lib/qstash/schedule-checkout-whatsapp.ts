import { processCheckoutWhatsAppJob } from '@/lib/notifications/checkout-wa';
import type { CheckoutWhatsAppJobBody } from '@/lib/qstash/checkout-whatsapp-job';

export type { CheckoutWhatsAppJobBody } from '@/lib/qstash/checkout-whatsapp-job';

/**
 * Kirim WA checkout langsung (sync) via StarSender.
 *
 * QStash/Upstash sengaja dilepas sementara — sama alasan dengan payment-success WA.
 */
export async function scheduleCheckoutWhatsAppJob(body: CheckoutWhatsAppJobBody): Promise<void> {
  console.info('checkout_whatsapp: direct (QStash disabled)');
  const result = await processCheckoutWhatsAppJob(body);
  if (result.outcome === 'failed') {
    console.error('checkout_whatsapp_direct_failed', result.error ?? result);
  } else {
    console.info('checkout_whatsapp_direct', result.outcome);
  }
}
