import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { processCheckoutWhatsAppJob } from '@/lib/notifications/checkout-wa';

export const runtime = 'nodejs';

async function handler(request: Request): Promise<Response> {
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

export const POST =
  qk && qn
    ? verifySignatureAppRouter(handler, {
        currentSigningKey: qk,
        nextSigningKey: qn,
      })
    : async () => Response.json({ error: 'qstash_signing_keys_not_configured' }, { status: 503 });
