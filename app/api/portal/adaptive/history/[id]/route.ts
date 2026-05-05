import { NextResponse } from 'next/server';
import { getCachedServerSession } from '@/lib/auth-cached';
import { isStudentVisibleToViewer, getAdaptiveTestDetail } from '@/lib/data/server/adaptive';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getCachedServerSession();
  const userId = session?.user?.userId;
  const role = session?.user?.role ?? '';

  if (userId == null) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const testId = Number(id);
  if (!testId || Number.isNaN(testId)) {
    return NextResponse.json({ error: 'Invalid test id' }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const studentId = Number(searchParams.get('studentId'));
  if (!studentId || Number.isNaN(studentId)) {
    return NextResponse.json({ error: 'studentId is required' }, { status: 400 });
  }

  const questionsOffset = Math.max(0, Number(searchParams.get('questionsOffset')) || 0);
  const questionsLimit = Math.min(50, Math.max(1, Number(searchParams.get('questionsLimit')) || 2));

  const visible = await isStudentVisibleToViewer(userId, role, studentId);
  if (!visible) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const detail = await getAdaptiveTestDetail(testId, studentId, questionsOffset, questionsLimit);
  if (!detail) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(detail);
}
