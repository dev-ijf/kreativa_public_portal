import { NextResponse } from 'next/server';
import { getCachedServerSession } from '@/lib/auth-cached';
import { getHabitsSummaryRange } from '@/lib/data/server/habits';

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
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (!Number.isFinite(studentId) || !from || !to) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const result = await getHabitsSummaryRange(userId, role, studentId, from, to);

  if (result === false) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  if (result === null) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json(result);
}
