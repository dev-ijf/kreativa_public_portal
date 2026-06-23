import { NextResponse } from 'next/server';
import { getCachedServerSession } from '@/lib/auth-cached';
import { getDailyReportCalendarMonth } from '@/lib/data/server/daily-reports';

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
  const year = Number(searchParams.get('year'));
  const month = Number(searchParams.get('month'));

  if (!Number.isFinite(studentId) || !Number.isFinite(year) || !Number.isFinite(month)) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  if (month < 1 || month > 12) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const days = await getDailyReportCalendarMonth(userId, role, studentId, year, month - 1);

  if (days === null) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({ days });
}
