import { NextResponse } from 'next/server';
import { getCachedServerSession } from '@/lib/auth-cached';
import { updateDailyReportParentCorner } from '@/lib/data/server/daily-reports';

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
  const date =
    typeof body.date === 'string'
      ? body.date.slice(0, 10)
      : typeof body.reportDate === 'string'
        ? body.reportDate.slice(0, 10)
        : '';

  const parentMessage =
    body.parentMessage !== undefined
      ? typeof body.parentMessage === 'string'
        ? body.parentMessage
        : body.parentMessage === null
          ? null
          : undefined
      : body.parent_message !== undefined
        ? typeof body.parent_message === 'string'
          ? body.parent_message
          : body.parent_message === null
            ? null
            : undefined
        : undefined;

  const parentReadConfirmed =
    typeof body.parentReadConfirmed === 'boolean'
      ? body.parentReadConfirmed
      : typeof body.parent_read_confirmed === 'boolean'
        ? body.parent_read_confirmed
        : undefined;

  if (!Number.isFinite(studentId) || !date) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  if (parentMessage === undefined && parentReadConfirmed === undefined) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const result = await updateDailyReportParentCorner(userId, role, studentId, date, {
    parentMessage,
    parentReadConfirmed,
  });

  if (!result.ok) {
    if (result.reason === 'forbidden' || result.reason === 'not_kg') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (result.reason === 'future_date' || result.reason === 'bad_date') {
      return NextResponse.json({ error: 'Bad request' }, { status: 400 });
    }
    if (result.reason === 'not_found') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Conflict' }, { status: 409 });
  }

  return NextResponse.json({ report: result.report });
}
