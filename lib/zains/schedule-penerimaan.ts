import { processZainsPenerimaanJob } from '@/lib/zains/process-penerimaan';
import type { ZainsPenerimaanJobBody } from '@/lib/zains/process-penerimaan';

export type { ZainsPenerimaanJobBody };

function isTransientDbError(message: string | undefined): boolean {
  const m = String(message ?? '');
  return /fetch failed/i.test(m) || /Error connecting to database/i.test(m) || /ETIMEDOUT/i.test(m);
}

/**
 * Schedule FINS penerimaan. Prefer calling from Next.js `after()` so the work
 * survives the HTTP response on Vercel (bare `void` is frozen after ACK).
 * Retries once on transient Neon/MySQL network errors.
 */
export async function scheduleZainsPenerimaanJob(body: ZainsPenerimaanJobBody): Promise<void> {
  console.info('zains_penerimaan: start', {
    transactionId: body.transactionId,
  });

  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await processZainsPenerimaanJob(body);
      console.info('zains_penerimaan_done', {
        transactionId: body.transactionId,
        outcome: result.outcome,
        error: result.error,
        attempt,
      });
      // Retry only when job reported failed with transient network error.
      if (
        result.outcome === 'failed' &&
        isTransientDbError(result.error) &&
        attempt < maxAttempts
      ) {
        const waitMs = 800 * attempt;
        console.warn('zains_penerimaan_retry', {
          transactionId: body.transactionId,
          attempt,
          waitMs,
          error: result.error,
        });
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }
      return;
    } catch (err) {
      console.error('zains_penerimaan_unhandled', {
        transactionId: body.transactionId,
        attempt,
        err,
      });
      if (attempt >= maxAttempts) return;
      await new Promise((r) => setTimeout(r, 800 * attempt));
    }
  }
}
