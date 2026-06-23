import { NextResponse } from 'next/server';
import { getCachedServerSession } from '@/lib/auth-cached';
import { getDailyReportByDate } from '@/lib/data/server/daily-reports';

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
  const date =
    typeof searchParams.get('date') === 'string' ? searchParams.get('date')!.slice(0, 10) : '';

  if (!Number.isFinite(studentId) || !date) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const result = await getDailyReportByDate(userId, role, studentId, date);

  if (!result.ok) {
    if (result.reason === 'bad_date') {
      return NextResponse.json({ error: 'Bad request' }, { status: 400 });
    }
    if (result.reason === 'forbidden' || result.reason === 'not_kg') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ report: null }, { status: 200 });
  }

  return NextResponse.json({ report: result.report });
}
