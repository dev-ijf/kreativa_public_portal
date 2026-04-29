import { renderToBuffer } from '@react-pdf/renderer';
import { createElement } from 'react';
import { getCachedServerSession } from '@/lib/auth-cached';
import { getReceiptPayloadForPortal } from '@/lib/data/server/finance-transactions';
import { TuitionReceiptPdfDoc } from '@/lib/pdf/tuition-receipt-pdf';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const session = await getCachedServerSession();
  const userId = session?.user?.userId;
  const role = session?.user?.role ?? '';
  if (userId == null) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const transactionIdRaw = searchParams.get('transactionId');
  const createdAt = searchParams.get('createdAt');
  if (!transactionIdRaw || !createdAt) {
    return new Response('Bad request', { status: 400 });
  }

  const payload = await getReceiptPayloadForPortal(userId, role, transactionIdRaw, createdAt);
  if (!payload) {
    return new Response('Not found', { status: 404 });
  }

  const buffer = await renderToBuffer(
    createElement(TuitionReceiptPdfDoc, { data: payload }) as Parameters<typeof renderToBuffer>[0],
  );
  const filename = `kwitansi-${payload.referenceNo.replace(/[^\w.-]+/g, '_')}.pdf`;

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
