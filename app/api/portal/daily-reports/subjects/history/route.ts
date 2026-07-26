import { NextResponse } from 'next/server';
import { getCachedServerSession } from '@/lib/auth-cached';
import { getSubjectHistory } from '@/lib/data/server/daily-reports';

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
  const learningAreaId = Number(searchParams.get('learningAreaId'));

  if (!Number.isFinite(studentId) || !Number.isFinite(learningAreaId)) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const result = await getSubjectHistory(userId, role, studentId, learningAreaId);

  if (!result.ok) {
    if (result.reason === 'bad_request') {
      return NextResponse.json({ error: 'Bad request' }, { status: 400 });
    }
    if (result.reason === 'forbidden' || result.reason === 'unsupported_level') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ items: result.items });
}
