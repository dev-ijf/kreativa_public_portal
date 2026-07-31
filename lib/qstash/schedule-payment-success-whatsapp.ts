import { processPaymentSuccessWhatsAppJob } from '@/lib/notifications/payment-success-wa';
import type { PaymentSuccessWhatsAppJobBody } from '@/lib/qstash/payment-success-whatsapp-job';

export type { PaymentSuccessWhatsAppJobBody } from '@/lib/qstash/payment-success-whatsapp-job';

/**
 * Kirim WA PAYMENT_SUCCESS langsung (sync) via StarSender.
 *
 * QStash/Upstash sengaja dilepas sementara — publish webhook async sering
 * tidak sampai / tidak diproses, sehingga parent tidak menerima WA paid.
 */
export async function schedulePaymentSuccessWhatsAppJob(
  body: PaymentSuccessWhatsAppJobBody,
): Promise<void> {
  console.info('payment_success_whatsapp: direct (QStash disabled)');
  const result = await processPaymentSuccessWhatsAppJob(body);
  if (result.outcome === 'failed') {
    console.error('payment_success_whatsapp_direct_failed', result.error ?? result);
  } else {
    console.info('payment_success_whatsapp_direct', result.outcome);
  }
}
