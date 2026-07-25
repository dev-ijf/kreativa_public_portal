import { NextResponse } from 'next/server';
import { getCachedServerSession } from '@/lib/auth-cached';
import { confirmSecondaryWeeklyParentIbadah } from '@/lib/data/server/secondary-weekly';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request) {
  const session = await getCachedServerSession();
  const userId = session?.user?.userId;
  const role = session?.user?.role ?? '';

  if (userId == null) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const studentId = Number(body.studentId);
  const date = typeof body.date === 'string' ? body.date.slice(0, 10) : '';
  const confirmed = body.confirmed === true;
  const parentName = typeof body.parentName === 'string' ? body.parentName : null;

  if (!Number.isFinite(studentId) || !date) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const result = await confirmSecondaryWeeklyParentIbadah(
    userId,
    role,
    studentId,
    date,
    confirmed,
    parentName,
  );

  if (!result.ok) {
    if (result.reason === 'not_found' || result.reason === 'no_week') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (result.reason === 'forbidden' || result.reason === 'unsupported_level') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  return NextResponse.json({ week: result.week });
}
