import {
  processCheckoutEmailJob,
  type CheckoutEmailJobBody,
} from '@/lib/notifications/checkout-email';

export type { CheckoutEmailJobBody } from '@/lib/notifications/checkout-email';

/**
 * Kirim email checkout langsung (sync) via SMTP.
 * Mirror scheduleCheckoutWhatsAppJob — QStash disabled.
 */
export async function scheduleCheckoutEmailJob(body: CheckoutEmailJobBody): Promise<void> {
  console.info('checkout_email: direct');
  const result = await processCheckoutEmailJob(body);
  if (result.outcome === 'failed') {
    console.error('checkout_email_direct_failed', result.error ?? result);
  } else {
    console.info('checkout_email_direct', result.outcome);
  }
}
