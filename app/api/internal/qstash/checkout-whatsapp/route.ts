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

async function runJob(body: unknown): Promise<Response> {
  const b = body as { transactionId?: string; transactionCreatedAt?: string; userId?: number };
  const transactionId = b.transactionId;
  const transactionCreatedAt = b.transactionCreatedAt;
  const userId = b.userId;
  if (
    typeof transactionId !== 'string' ||
    typeof transactionCreatedAt !== 'string' ||
    typeof userId !== 'number' ||
    !Number.isFinite(userId)
  ) {
    return Response.json({ error: 'bad_body' }, { status: 400 });
  }

  const result = await processCheckoutWhatsAppJob({ transactionId, transactionCreatedAt, userId });

  if (result.retryableFailure) {
    return Response.json({ error: result.error ?? 'delivery_failed' }, { status: 500 });
  }
  return Response.json({ ok: true, outcome: result.outcome });
}

export async function POST(request: Request): Promise<Response> {
  // 1. Bypass internal via header secret (Postman / worker internal)
  if (internalBypassOk(request)) {
    try {
      return runJob(await request.json());
    } catch {
      return Response.json({ error: 'bad_json' }, { status: 400 });
    }
  }

  // 2. Tanpa signing key → dev / belum konfigurasi → terima langsung
  if (!qk || !qn) {
    try {
      return runJob(await request.json());
    } catch {
      return Response.json({ error: 'bad_json' }, { status: 400 });
    }
  }

  // 3. Produksi: verifikasi QStash signature
  const sig = request.headers.get('upstash-signature');
  if (!sig) {
    return Response.json({ error: 'missing_upstash_signature' }, { status: 401 });
  }

  // Baca body SEKALI sebagai text mentah (jangan .json() dulu — hash SHA-256 harus dari raw string)
  let bodyText: string;
  try {
    bodyText = await request.text();
  } catch {
    return Response.json({ error: 'bad_body_read' }, { status: 400 });
  }

  const receiver = new Receiver({ currentSigningKey: qk, nextSigningKey: qn });

  try {
    await receiver.verify({
      signature: sig,
      body: bodyText,
      clockTolerance: 300,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('qstash_signature_verify_failed', {
      message: msg,
      bodyLength: bodyText.length,
      sigLength: sig.length,
    });
    return Response.json(
      {
        error: 'signature_verification_failed',
        hint: 'Pastikan QSTASH_CURRENT_SIGNING_KEY dan QSTASH_NEXT_SIGNING_KEY dari proyek QStash yang sama dengan QSTASH_TOKEN. Pastikan middleware tidak consume body sebelum handler.',
      },
      { status: 401 },
    );
  }

  try {
    return runJob(JSON.parse(bodyText));
  } catch {
    return Response.json({ error: 'bad_json' }, { status: 400 });
  }
}
