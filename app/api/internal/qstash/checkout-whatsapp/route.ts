import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { processCheckoutWhatsAppJob } from '@/lib/notifications/checkout-wa';

export const runtime = 'nodejs';

async function checkoutWhatsAppHandler(request: Request): Promise<Response> {
  let body: { transactionId?: string; transactionCreatedAt?: string; userId?: number };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: 'bad_json' }, { status: 400 });
  }

  const transactionId = body.transactionId;
  const transactionCreatedAt = body.transactionCreatedAt;
  const userId = body.userId;
  if (
    typeof transactionId !== 'string' ||
    typeof transactionCreatedAt !== 'string' ||
    typeof userId !== 'number' ||
    !Number.isFinite(userId)
  ) {
    return Response.json({ error: 'bad_body' }, { status: 400 });
  }

  const result = await processCheckoutWhatsAppJob({
    transactionId,
    transactionCreatedAt,
    userId,
  });

  if (result.retryableFailure) {
    return Response.json({ error: result.error ?? 'delivery_failed' }, { status: 500 });
  }

  return Response.json({ ok: true, outcome: result.outcome });
}

const qk = process.env.QSTASH_CURRENT_SIGNING_KEY?.trim();
const qn = process.env.QSTASH_NEXT_SIGNING_KEY?.trim();

/**
 * Panggilan dari Upstash QStash membawa header tanda tangan; POST manual tanpa itu → 401.
 * Untuk uji lokal/Postman: set `QSTASH_INTERNAL_WEBHOOK_SECRET` lalu kirim header
 * `x-internal-webhook-secret: <nilai yang sama>` (jangan set secret lemah di production).
 */
const internalSecret = process.env.QSTASH_INTERNAL_WEBHOOK_SECRET?.trim();

const qstashSignedPost =
  qk && qn
    ? verifySignatureAppRouter(checkoutWhatsAppHandler, {
        currentSigningKey: qk,
        nextSigningKey: qn,
      })
    : null;

export async function POST(request: Request): Promise<Response> {
  if (internalSecret) {
    const raw =
      request.headers.get('x-internal-webhook-secret') ??
      (request.headers.get('authorization')?.startsWith('Bearer ')
        ? request.headers.get('authorization')!.slice(7).trim()
        : null);
    if (raw === internalSecret) {
      return checkoutWhatsAppHandler(request);
    }
  }

  if (qstashSignedPost) {
    return qstashSignedPost(request);
  }

  return Response.json(
    {
      error: 'qstash_not_configured',
      hint:
        '401 pada POST manual: endpoint memverifikasi tanda tangan Upstash. Pasang QSTASH_CURRENT_SIGNING_KEY + QSTASH_NEXT_SIGNING_KEY dari dashboard QStash, atau untuk uji set QSTASH_INTERNAL_WEBHOOK_SECRET dan header x-internal-webhook-secret.',
    },
    { status: 503 },
  );
}
