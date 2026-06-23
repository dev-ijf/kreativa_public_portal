import { NextResponse } from 'next/server';
import { getCachedServerSession } from '@/lib/auth-cached';
import { getDailyReportSummaryRange } from '@/lib/data/server/daily-reports';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await getCachedServerSession();
  const userId = session?.user?.userId;
  const role = session?.user?.role ?? '';

  if (userId == null) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const studentId = Number(searchParams.get('studentId'));
  const from =
    typeof searchParams.get('from') === 'string' ? searchParams.get('from')!.slice(0, 10) : '';
  const to = typeof searchParams.get('to') === 'string' ? searchParams.get('to')!.slice(0, 10) : '';

  if (!Number.isFinite(studentId) || !from || !to) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const summary = await getDailyReportSummaryRange(userId, role, studentId, from, to);

  if (summary === null) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json(summary);
}
