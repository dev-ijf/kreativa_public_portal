import { NextResponse } from 'next/server';
import { getCachedServerSession } from '@/lib/auth-cached';
import {
  getTuitionTransactionsForPortal,
  getPendingCheckoutTransactionsForPortal,
} from '@/lib/data/server/finance-transactions';

export async function GET(request: Request) {
  const session = await getCachedServerSession();
  const userId = session?.user?.userId;
  const role = session?.user?.role ?? '';
  if (userId == null) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const studentId = Number(url.searchParams.get('studentId'));
  const tab = url.searchParams.get('tab') as 'paid' | 'checkout' | null;
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 5, 1), 50);
  const offset = Math.max(Number(url.searchParams.get('offset')) || 0, 0);

  if (!Number.isFinite(studentId) || studentId <= 0 || !tab) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const fetcher = tab === 'paid'
    ? getTuitionTransactionsForPortal
    : getPendingCheckoutTransactionsForPortal;

  const items = await fetcher(userId, role, studentId, { limit, offset });
  if (items === null) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({ items, hasMore: items.length >= limit });
}
