import { NextResponse } from 'next/server';
import { getCachedServerSession } from '@/lib/auth-cached';
import { getUpcomingHomework } from '@/lib/data/server/daily-reports';

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

  if (!Number.isFinite(studentId)) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const result = await getUpcomingHomework(userId, role, studentId);

  if (!result.ok) {
    if (result.reason === 'forbidden' || result.reason === 'unsupported_level') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ items: result.items });
}
