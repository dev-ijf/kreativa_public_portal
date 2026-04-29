import { NextResponse } from 'next/server';
import { getCachedServerSession } from '@/lib/auth-cached';
import {
  getAttendanceHistoryPage,
  type AttendanceHistoryCursor,
} from '@/lib/data/server/attendance';

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
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const statusParam = searchParams.get('status');
  const status =
    statusParam && statusParam.trim().toLowerCase() !== 'all' ? statusParam.trim() : null;
  const cursorDate = searchParams.get('cursorDate');
  const cursorId = searchParams.get('cursorId');
  const cursor: AttendanceHistoryCursor | null =
    cursorDate && cursorId ? { attendanceDate: cursorDate, id: cursorId } : null;

  if (!Number.isFinite(studentId) || !from || !to) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const result = await getAttendanceHistoryPage(userId, role, studentId, {
    fromDate: from,
    toDate: to,
    status,
    limit: 5,
    cursor,
  });

  if (!result) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json(result);
}
