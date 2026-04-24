import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getHabitCalendarMonth } from '@/lib/data/server/habits';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
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

  const result = await getHabitCalendarMonth(userId, role, studentId, year, month - 1);

  if (result === null) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({ days: result });
}
