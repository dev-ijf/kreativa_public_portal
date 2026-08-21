import { NextRequest, NextResponse } from 'next/server';
import { processZainsPenerimaanJob } from '@/lib/zains/process-penerimaan';

export const runtime = 'nodejs';

function internalOk(request: NextRequest): boolean {
  const secret =
    process.env.ZAINS_INTERNAL_SECRET?.trim() ||
    process.env.QSTASH_INTERNAL_WEBHOOK_SECRET?.trim();
  if (!secret) {
    // Allow in local when secret unset; production should set ZAINS_INTERNAL_SECRET
    return process.env.NODE_ENV !== 'production';
  }
  const auth = request.headers.get('authorization');
  const bearer = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : null;
  const raw = request.headers.get('x-internal-secret') ?? bearer;
  return raw === secret;
}

export async function POST(req: NextRequest) {
  if (!internalOk(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { transactionId?: string | number; transactionCreatedAt?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (body.transactionId == null) {
    return NextResponse.json({ error: 'transactionId required' }, { status: 400 });
  }

  const result = await processZainsPenerimaanJob({
    transactionId: body.transactionId,
    transactionCreatedAt: body.transactionCreatedAt,
  });

  const status =
    result.outcome === 'failed' ? 500 : result.outcome === 'skipped' ? 200 : 200;
  return NextResponse.json(result, { status });
}
