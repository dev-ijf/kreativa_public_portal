import { NextResponse } from 'next/server';
import { getCachedServerSession } from '@/lib/auth-cached';
import { getTtqAchieved } from '@/lib/data/server/ttq';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await getCachedServerSession();
  const userId = session?.user?.userId;
  const role = session?.user?.role ?? '';
  if (userId == null) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const studentId = Number(new URL(request.url).searchParams.get('studentId'));
  if (!Number.isFinite(studentId)) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const items = await getTtqAchieved(userId, role, studentId);
  if (!items) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return NextResponse.json({ items });
}
