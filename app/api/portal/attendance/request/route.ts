import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { insertAttendanceEntry } from '@/lib/data/server/attendance';

export const dynamic = 'force-dynamic';

type Body = {
  studentId?: number;
  attendanceDate?: string;
  status?: string;
  note?: string;
  noteEn?: string;
  noteId?: string;
};

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.userId;
  const role = session?.user?.role ?? '';

  if (userId == null) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const studentId = Number(body.studentId);
  const attendanceDate = typeof body.attendanceDate === 'string' ? body.attendanceDate.slice(0, 10) : '';
  const status = body.status === 'sick' || body.status === 'permission' ? body.status : null;

  const noteCombined =
    typeof body.note === 'string' && body.note.trim()
      ? body.note.trim()
      : '';
  const noteEn =
    typeof body.noteEn === 'string' && body.noteEn.trim()
      ? body.noteEn.trim()
      : noteCombined;
  const noteId =
    typeof body.noteId === 'string' && body.noteId.trim()
      ? body.noteId.trim()
      : noteCombined;

  if (!Number.isFinite(studentId) || !attendanceDate || !status) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const result = await insertAttendanceEntry(userId, role, {
    studentId,
    attendanceDate,
    status,
    noteEn,
    noteId,
  });

  if (!result.ok) {
    if (result.reason === 'forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (result.reason === 'duplicate') {
      return NextResponse.json({ error: 'Duplicate date' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  return NextResponse.json({ row: result.row }, { status: 201 });
}
