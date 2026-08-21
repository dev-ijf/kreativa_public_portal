import { processZainsPenerimaanJob } from '@/lib/zains/process-penerimaan';
import type { ZainsPenerimaanJobBody } from '@/lib/zains/process-penerimaan';

export type { ZainsPenerimaanJobBody };

/**
 * Fire-and-forget FINS penerimaan. Never await from Muamalat VA route.
 * Failures are logged; paid settlement / WA / email stay independent.
 */
export function scheduleZainsPenerimaanJob(body: ZainsPenerimaanJobBody): void {
  console.info('zains_penerimaan: schedule (async)', {
    transactionId: body.transactionId,
  });
  void processZainsPenerimaanJob(body)
    .then((result) => {
      console.info('zains_penerimaan_done', {
        transactionId: body.transactionId,
        outcome: result.outcome,
        error: result.error,
      });
    })
    .catch((err) => {
      console.error('zains_penerimaan_unhandled', {
        transactionId: body.transactionId,
        err,
      });
    });
}
