import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPaymentInstructionsForPortalViewer } from '@/lib/data/server/payment-methods';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.userId;
  const role = session?.user?.role ?? '';
  if (userId == null) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const methodId = Number(searchParams.get('methodId'));
  if (!Number.isFinite(methodId) || methodId <= 0) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const rows = await getPaymentInstructionsForPortalViewer(userId, role, methodId);
  if (rows === null) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({ rows });
}
