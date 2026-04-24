import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  HABIT_BOOLEAN_KEYS,
  type OnTimeArrivalValue,
  type PortalHabitDayPayload,
} from '@/lib/portal/habits-shared';
import { getHabitByDate, upsertHabitDay } from '@/lib/data/server/habits';

export const dynamic = 'force-dynamic';

function parseOnTime(v: unknown): OnTimeArrivalValue {
  if (v === 'on_time' || v === 'late' || v === 'permission' || v === 'sick' || v === 'holiday' || v === null) {
    return v;
  }
  if (v === '') return null;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (s === 'on_time' || s === 'tepat') return 'on_time';
    if (s === 'late' || s === 'terlambat') return 'late';
    if (s === 'permission' || s === 'izin') return 'permission';
    if (s === 'sick' || s === 'sakit') return 'sick';
    if (s === 'holiday' || s === 'libur') return 'holiday';
  }
  return null;
}

function parsePayload(body: Record<string, unknown>): PortalHabitDayPayload | null {
  const out = {} as PortalHabitDayPayload;
  for (const k of HABIT_BOOLEAN_KEYS) {
    const v = body[k];
    if (typeof v !== 'boolean') return null;
    out[k] = v;
  }
  out.onTimeArrival = parseOnTime(body.onTimeArrival ?? body.on_time_arrival);
  const q = body.quranJuzInfo ?? body.quran_juz_info;
  out.quranJuzInfo = typeof q === 'string' ? q : null;
  return out;
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.userId;
  const role = session?.user?.role ?? '';

  if (userId == null) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const studentId = Number(searchParams.get('studentId'));
  const date = typeof searchParams.get('date') === 'string' ? searchParams.get('date')!.slice(0, 10) : '';

  if (!Number.isFinite(studentId) || !date) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const result = await getHabitByDate(userId, role, studentId, date);

  if (!result.ok) {
    if (result.reason === 'bad_date') {
      return NextResponse.json({ error: 'Bad request' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({ row: result.row });
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
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
      : typeof body.habitDate === 'string'
        ? body.habitDate.slice(0, 10)
        : '';

  const payload = parsePayload(body);
  if (!Number.isFinite(studentId) || !date || !payload) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const result = await upsertHabitDay(userId, role, studentId, date, payload);

  if (!result.ok) {
    if (result.reason === 'forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (result.reason === 'future_date') {
      return NextResponse.json({ error: 'Future date not allowed' }, { status: 400 });
    }
    if (result.reason === 'bad_request') {
      return NextResponse.json({ error: 'Bad request' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Conflict' }, { status: 409 });
  }

  return NextResponse.json({ row: result.row });
}
