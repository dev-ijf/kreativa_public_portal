import {
  processPaymentSuccessEmailJob,
  type PaymentSuccessEmailJobBody,
} from '@/lib/notifications/payment-success-email';

export type { PaymentSuccessEmailJobBody } from '@/lib/notifications/payment-success-email';

/**
 * Kirim email PAYMENT_PAID langsung (sync) via SMTP.
 * Mirror schedulePaymentSuccessWhatsAppJob — QStash disabled.
 */
export async function schedulePaymentSuccessEmailJob(
  body: PaymentSuccessEmailJobBody,
): Promise<void> {
  console.info('payment_success_email: direct');
  const result = await processPaymentSuccessEmailJob(body);
  if (result.outcome === 'failed') {
    console.error('payment_success_email_direct_failed', result.error ?? result);
  } else {
    console.info('payment_success_email_direct', result.outcome);
  }
}
