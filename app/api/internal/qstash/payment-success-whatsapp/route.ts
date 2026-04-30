import { Receiver } from '@upstash/qstash';
import { processPaymentSuccessWhatsAppJob } from '@/lib/notifications/payment-success-wa';

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

function decodeJwtPayloadUnsafe(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = Buffer.from(parts[1], 'base64url').toString('utf-8');
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

async function runJob(body: unknown): Promise<Response> {
  const b = body as {
    transactionId?: string;
    userId?: number;
    channelId?: string;
  };
  const transactionId = b.transactionId;
  const userId = b.userId;
  if (typeof transactionId !== 'string' || typeof userId !== 'number' || !Number.isFinite(userId)) {
    return Response.json({ error: 'bad_body' }, { status: 400 });
  }

  const result = await processPaymentSuccessWhatsAppJob({
    transactionId,
    userId,
    channelId: typeof b.channelId === 'string' ? b.channelId : undefined,
  });

  if (result.retryableFailure) {
    return Response.json({ error: result.error ?? 'delivery_failed' }, { status: 500 });
  }
  return Response.json({ ok: true, outcome: result.outcome });
}

export async function POST(request: Request): Promise<Response> {
  if (internalBypassOk(request)) {
    try {
      return runJob(await request.json());
    } catch {
      return Response.json({ error: 'bad_json' }, { status: 400 });
    }
  }

  if (!qk || !qn) {
    console.warn('qstash_payment_success_no_signing_keys — accepting without verification');
    try {
      return runJob(await request.json());
    } catch {
      return Response.json({ error: 'bad_json' }, { status: 400 });
    }
  }

  const sig = request.headers.get('upstash-signature');
  if (!sig) {
    return Response.json({ error: 'missing_upstash_signature' }, { status: 401 });
  }

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
    const jwtClaims = decodeJwtPayloadUnsafe(sig);
    console.error('qstash_payment_success_signature_verify_failed', {
      message: msg,
      jwtIss: jwtClaims?.iss,
      jwtSub: jwtClaims?.sub,
    });
    return Response.json({ error: 'signature_verification_failed' }, { status: 401 });
  }

  try {
    return runJob(JSON.parse(bodyText));
  } catch {
    return Response.json({ error: 'bad_json' }, { status: 400 });
  }
}
