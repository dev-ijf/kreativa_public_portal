import { NextResponse } from 'next/server';
import { getCachedServerSession } from '@/lib/auth-cached';
import { getKgHabitMonthSummary } from '@/lib/data/server/kg-habits';

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

  const result = await getKgHabitMonthSummary(userId, role, studentId, year, month);
  if (!result.ok) {
    if (result.reason === 'forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  return NextResponse.json({
    year: result.year,
    month: result.month,
    daysInMonth: result.daysInMonth,
    stats: result.stats,
    tree: result.tree,
  });
}
