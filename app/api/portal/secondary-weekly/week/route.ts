import { NextResponse } from 'next/server';
import { getCachedServerSession } from '@/lib/auth-cached';
import {
  getSecondaryWeeklyByDate,
  upsertSecondaryWeekly,
} from '@/lib/data/server/secondary-weekly';
import {
  emptySecondaryWeeklyPayload,
  type SecondaryWeeklyPayload,
} from '@/lib/portal/secondary-weekly-shared';

export const dynamic = 'force-dynamic';

function parsePayload(body: Record<string, unknown>): SecondaryWeeklyPayload | null {
  const base = emptySecondaryWeeklyPayload();
  const keys = [
    'akhlaqReflection',
    'bestLearningMoment',
    'mostChallenging',
    'unansweredQuestion',
    'weeklyGoal',
    'messageToHomeroom',
  ] as const;

  for (const k of keys) {
    const v = body[k];
    if (v !== null && typeof v !== 'string') return null;
    base[k] = typeof v === 'string' ? v : null;
  }
  return base;
}

export async function GET(request: Request) {
  const session = await getCachedServerSession();
  const userId = session?.user?.userId;
  const role = session?.user?.role ?? '';

  if (userId == null) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const studentId = Number(searchParams.get('studentId'));
  const date =
    typeof searchParams.get('date') === 'string' ? searchParams.get('date')!.slice(0, 10) : '';

  if (!Number.isFinite(studentId) || !date) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const result = await getSecondaryWeeklyByDate(userId, role, studentId, date);
  if (!result.ok) {
    if (result.reason === 'no_week') {
      return NextResponse.json({ week: null, error: 'No week config' }, { status: 200 });
    }
    if (result.reason === 'bad_date' || result.reason === 'missing_class') {
      return NextResponse.json({ error: 'Bad request' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({ week: result.week });
}

export async function PUT(request: Request) {
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
  const submit = body.submit === true;
  const payload = parsePayload(body);

  if (!Number.isFinite(studentId) || !date || !payload) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const result = await upsertSecondaryWeekly(userId, role, studentId, date, payload, submit);
  if (!result.ok) {
    if (result.reason === 'no_week') {
      return NextResponse.json({ error: 'No week config for this date' }, { status: 400 });
    }
    if (result.reason === 'forbidden' || result.reason === 'unsupported_level') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  return NextResponse.json({ week: result.week });
}
