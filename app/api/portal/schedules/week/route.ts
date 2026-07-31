import { NextResponse } from 'next/server';
import { getCachedServerSession } from '@/lib/auth-cached';
import { getPortalScheduleWeek } from '@/lib/data/server/schedules-week';
import type { WeekDirection } from '@/lib/data/server/week-configs';

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
  const weekConfigId = Number(searchParams.get('weekConfigId'));
  const directionRaw = searchParams.get('direction');
  const direction: WeekDirection | null =
    directionRaw === 'prev' || directionRaw === 'next' ? directionRaw : null;

  if (!Number.isFinite(studentId) || !Number.isFinite(weekConfigId)) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  if (directionRaw != null && direction == null) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const result = await getPortalScheduleWeek(
    userId,
    role,
    studentId,
    weekConfigId,
    direction,
  );

  if (!result.ok) {
    if (result.reason === 'forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (result.reason === 'no_week') {
      return NextResponse.json({ error: 'No adjacent week' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  return NextResponse.json(result.data);
}
