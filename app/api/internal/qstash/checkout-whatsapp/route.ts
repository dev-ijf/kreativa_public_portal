import { Receiver } from '@upstash/qstash';
import { processCheckoutWhatsAppJob } from '@/lib/notifications/checkout-wa';

export const runtime = 'nodejs';

const qk = process.env.QSTASH_CURRENT_SIGNING_KEY?.trim();
const qn = process.env.QSTASH_NEXT_SIGNING_KEY?.trim();
const internalSecret = process.env.QSTASH_INTERNAL_WEBHOOK_SECRET?.trim();

function internalBypassOk(request: Request): boolean {
  if (!internalSecret) return false;
  const auth = request.headers.get('authorization');
  const bearer = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : null;
  const raw = request.headers.get('x-internal-webhook-secret') ?? bearer;
  return raw === internalSecret;
}

async function checkoutWhatsAppHandler(request: Request): Promise<Response> {
  let body: { transactionId?: string; transactionCreatedAt?: string; userId?: number };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: 'bad_json' }, { status: 400 });
  }
  return runCheckoutWhatsappFromBody(body);
}

async function runCheckoutWhatsappFromBody(body: {
  transactionId?: string;
  transactionCreatedAt?: string;
  userId?: number;
}): Promise<Response> {
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

export async function POST(request: Request): Promise<Response> {
  if (internalBypassOk(request)) {
    return checkoutWhatsAppHandler(request);
  }

  if (!qk || !qn) {
    return Response.json(
      {
        error: 'qstash_signing_keys_not_configured',
        hint: 'Set QSTASH_CURRENT_SIGNING_KEY dan QSTASH_NEXT_SIGNING_KEY dari Upstash Console.',
      },
      { status: 503 },
    );
  }

  const sig = request.headers.get('upstash-signature') ?? request.headers.get('Upstash-Signature');
  if (!sig) {
    return Response.json({ error: 'missing_upstash_signature' }, { status: 401 });
  }

  let bodyText: string;
  try {
    bodyText = await request.text();
  } catch {
    return Response.json({ error: 'bad_body_read' }, { status: 400 });
  }

  const receiver = new Receiver({
    currentSigningKey: qk,
    nextSigningKey: qn,
  });

  try {
    // Tanpa `url`: JWT `sub` tidak dibandingkan string ke URL server (sering beda dengan
    // `request.url` / proxy). Tetap aman: tanda tangan + issuer Upstash + hash SHA-256 body.
    await receiver.verify({
      signature: sig,
      body: bodyText,
      clockTolerance: 120,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('qstash_signature_verify_failed', { message: msg });
    return Response.json(
      {
        error: 'signature_verification_failed',
        hint:
          'Periksa QSTASH_CURRENT_SIGNING_KEY / QSTASH_NEXT_SIGNING_KEY dan QSTASH_TOKEN dari proyek yang sama. Body POST harus persis JSON yang dikirim QStash (jangan ubah di middleware).',
      },
      { status: 401 },
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyText) as unknown;
  } catch {
    return Response.json({ error: 'bad_json' }, { status: 400 });
  }

  return runCheckoutWhatsappFromBody(parsed as { transactionId?: string; transactionCreatedAt?: string; userId?: number });
}
