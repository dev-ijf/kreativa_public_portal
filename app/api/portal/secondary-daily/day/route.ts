import { NextResponse } from 'next/server';
import { getCachedServerSession } from '@/lib/auth-cached';
import {
  getSecondaryDailyByDate,
  upsertSecondaryDailyDay,
} from '@/lib/data/server/secondary-daily';
import {
  emptySecondaryDailyPayload,
  GOOD_DEED_TYPES,
  type EffortLevel,
  type GoodDeedType,
  type SecondaryDailyPayload,
  type UnderstandingLevel,
} from '@/lib/portal/secondary-daily-shared';

export const dynamic = 'force-dynamic';

function parsePayload(body: Record<string, unknown>): SecondaryDailyPayload | null {
  const base = emptySecondaryDailyPayload();
  const boolKeys = [
    'fajrPrayer',
    'asrPrayer',
    'maghribPrayer',
    'ishaPrayer',
    'tahajudPrayer',
    'morningDhikr',
    'eveningDhikr',
    'tilawahDone',
    'memorisationDone',
  ] as const;

  for (const k of boolKeys) {
    if (typeof body[k] !== 'boolean') return null;
    base[k] = body[k];
  }

  const dhuha = body.dhuhaPrayer;
  if (dhuha !== null && dhuha !== 'yes' && dhuha !== 'no') return null;
  base.dhuhaPrayer = dhuha;

  const zuhur = body.zuhurPrayer;
  if (
    zuhur !== null &&
    zuhur !== 'well_done' &&
    zuhur !== 'needs_guidance' &&
    zuhur !== 'did_not_pray'
  ) {
    return null;
  }
  base.zuhurPrayer = zuhur;

  const energy = body.energyLevel;
  if (energy !== null && (typeof energy !== 'number' || energy < 1 || energy > 5)) {
    return null;
  }
  base.energyLevel = energy;

  if (typeof body.isOnPeriod !== 'boolean') return null;
  base.isOnPeriod = body.isOnPeriod;

  if (!Array.isArray(body.goodDeeds)) return null;
  base.goodDeeds = [];
  for (const raw of body.goodDeeds) {
    if (!raw || typeof raw !== 'object') return null;
    const d = raw as Record<string, unknown>;
    if (!(GOOD_DEED_TYPES as readonly string[]).includes(String(d.deedType))) return null;
    base.goodDeeds.push({
      deedType: d.deedType as GoodDeedType,
      customDeed: typeof d.customDeed === 'string' ? d.customDeed : null,
    });
  }

  if (!Array.isArray(body.sessionReflections)) return null;
  base.sessionReflections = [];
  for (const raw of body.sessionReflections) {
    if (!raw || typeof raw !== 'object') return null;
    const s = raw as Record<string, unknown>;
    if (typeof s.sessionId !== 'number' || !Number.isFinite(s.sessionId)) return null;
    const understanding = s.understanding as UnderstandingLevel | null;
    const effort = s.effort as EffortLevel | null;
    if (
      understanding !== null &&
      understanding !== 'fully' &&
      understanding !== 'mostly' &&
      understanding !== 'partially' &&
      understanding !== 'need_help'
    ) {
      return null;
    }
    if (
      effort !== null &&
      effort !== 'maximum' &&
      effort !== 'good' &&
      effort !== 'could_do_more' &&
      effort !== 'needs_improvement'
    ) {
      return null;
    }
    base.sessionReflections.push({
      sessionId: s.sessionId,
      subjectName: typeof s.subjectName === 'string' ? s.subjectName : '',
      understanding,
      effort,
      quickNote: typeof s.quickNote === 'string' ? s.quickNote : null,
    });
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

  const result = await getSecondaryDailyByDate(userId, role, studentId, date);
  if (!result.ok) {
    if (result.reason === 'bad_date' || result.reason === 'missing_class') {
      return NextResponse.json({ error: 'Bad request' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({ day: result.day });
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
  const payload = parsePayload(body);

  if (!Number.isFinite(studentId) || !date || !payload) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const result = await upsertSecondaryDailyDay(userId, role, studentId, date, payload);
  if (!result.ok) {
    if (result.reason === 'forbidden' || result.reason === 'unsupported_level') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (result.reason === 'future_date') {
      return NextResponse.json({ error: 'Future date not allowed' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  return NextResponse.json({ day: result.day });
}
