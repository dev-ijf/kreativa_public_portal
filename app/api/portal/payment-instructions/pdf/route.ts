import { createElement } from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPaymentInstructionsPdfPayloadForPortal } from '@/lib/data/server/payment-instructions-pdf';
import { PaymentInstructionsPdfDoc } from '@/lib/pdf/payment-instructions-pdf';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.userId;
  const role = session?.user?.role ?? '';
  if (userId == null) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const methodId = Number(searchParams.get('methodId'));
  const transactionId = searchParams.get('transactionId') ?? '';
  const transactionCreatedAt = searchParams.get('transactionCreatedAt') ?? '';
  const expiryAt = searchParams.get('expiryAt');
  const langRaw = searchParams.get('lang');
  const lang = langRaw === 'en' ? 'en' : 'id';
  const inlinePdf = searchParams.get('preview') === '1' || searchParams.get('inline') === '1';

  if (!Number.isFinite(methodId) || methodId <= 0 || !transactionId || !transactionCreatedAt) {
    return new Response('Bad request', { status: 400 });
  }

  const payload = await getPaymentInstructionsPdfPayloadForPortal(userId, role, methodId, {
    transactionId,
    transactionCreatedAt,
    expiryAt: expiryAt || undefined,
    lang,
  });

  if (!payload) {
    return new Response('Not found', { status: 404 });
  }

  const buffer = await renderToBuffer(
    createElement(PaymentInstructionsPdfDoc, { data: payload }) as Parameters<typeof renderToBuffer>[0],
  );
  const safeRef = payload.referenceNo.replace(/[^\w.-]+/g, '_').slice(0, 40) || 'instruksi';
  const filename = `instruksi-bayar-${safeRef}.pdf`;

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${inlinePdf ? 'inline' : 'attachment'}; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
