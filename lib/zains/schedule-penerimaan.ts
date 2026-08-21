import { processZainsPenerimaanJob } from '@/lib/zains/process-penerimaan';
import type { ZainsPenerimaanJobBody } from '@/lib/zains/process-penerimaan';

export type { ZainsPenerimaanJobBody };

/**
 * Schedule FINS penerimaan. Prefer calling from Next.js `after()` so the work
 * survives the HTTP response on Vercel (bare `void` is frozen after ACK).
 */
export async function scheduleZainsPenerimaanJob(body: ZainsPenerimaanJobBody): Promise<void> {
  console.info('zains_penerimaan: start', {
    transactionId: body.transactionId,
  });
  try {
    const result = await processZainsPenerimaanJob(body);
    console.info('zains_penerimaan_done', {
      transactionId: body.transactionId,
      outcome: result.outcome,
      error: result.error,
    });
  } catch (err) {
    console.error('zains_penerimaan_unhandled', {
      transactionId: body.transactionId,
      err,
    });
  }
}
