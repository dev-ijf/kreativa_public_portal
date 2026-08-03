import { NextResponse } from 'next/server';
import { getCachedServerSession } from '@/lib/auth-cached';
import { getTtqHistory } from '@/lib/data/server/ttq';

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

  const limitRaw = Number(searchParams.get('limit') ?? 10);
  const offsetRaw = Number(searchParams.get('offset') ?? 0);
  const limit = Number.isFinite(limitRaw) ? limitRaw : 10;
  const offset = Number.isFinite(offsetRaw) ? offsetRaw : 0;

  const history = await getTtqHistory(userId, role, studentId, { limit, offset });
  if (!history) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return NextResponse.json(history);
}
