import { NextResponse } from 'next/server';
import { getCachedServerSession } from '@/lib/auth-cached';
import { getTtqRekap } from '@/lib/data/server/ttq';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await getCachedServerSession();
  const userId = session?.user?.userId;
  const role = session?.user?.role ?? '';
  if (userId == null) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sp = new URL(request.url).searchParams;
  const studentId = Number(sp.get('studentId'));
  const mode = (sp.get('mode') === 'year' ? 'year' : 'month') as 'month' | 'year';
  const month = sp.get('month');

  if (!Number.isFinite(studentId)) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const data = await getTtqRekap(userId, role, studentId, { mode, month });
  if (!data) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return NextResponse.json(data);
}
