import { NextResponse } from 'next/server';
import { getCachedServerSession } from '@/lib/auth-cached';
import { getKgHabitDay, upsertKgHabitDay } from '@/lib/data/server/kg-habits';

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
  const date =
    typeof searchParams.get('date') === 'string' ? searchParams.get('date')!.slice(0, 10) : '';

  if (!Number.isFinite(studentId) || !date) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const result = await getKgHabitDay(userId, role, studentId, date);
  if (!result.ok) {
    if (result.reason === 'bad_date') {
      return NextResponse.json({ error: 'Bad request' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({ day: result.day, tree: result.tree });
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
  const date =
    typeof body.date === 'string'
      ? body.date.slice(0, 10)
      : typeof body.habitDate === 'string'
        ? body.habitDate.slice(0, 10)
        : '';

  const rawItems = body.items;
  if (!Number.isFinite(studentId) || !date || !rawItems || typeof rawItems !== 'object') {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const items: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(rawItems as Record<string, unknown>)) {
    if (typeof v === 'boolean') items[k] = v;
  }

  const notes = typeof body.notes === 'string' ? body.notes : '';

  const result = await upsertKgHabitDay(userId, role, studentId, date, items, notes);
  if (!result.ok) {
    if (result.reason === 'forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (result.reason === 'future_date') {
      return NextResponse.json({ error: 'Future date not allowed' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  return NextResponse.json({ day: result.day, tree: result.tree });
}
