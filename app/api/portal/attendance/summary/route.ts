import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAttendanceSummary } from '@/lib/data/server/attendance';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.userId;
  const role = session?.user?.role ?? '';

  if (userId == null) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const studentId = Number(searchParams.get('studentId'));
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (!Number.isFinite(studentId) || !from || !to) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const summary = await getAttendanceSummary(userId, role, studentId, from, to);
  if (!summary) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json(summary);
}
