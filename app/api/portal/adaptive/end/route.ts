import { NextResponse } from 'next/server';
import { getCachedServerSession } from '@/lib/auth-cached';
import { isStudentVisibleToViewer, finalizeAdaptiveTest } from '@/lib/data/server/adaptive';
import { getAdaptiveSession, deleteAdaptiveSession } from '@/lib/cache/adaptive-session';

export async function POST(request: Request) {
  const session = await getCachedServerSession();
  const userId = session?.user?.userId;
  const role = session?.user?.role ?? '';

  if (userId == null) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { studentId?: number; testId?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { studentId, testId } = body;
  if (!studentId || !testId) {
    return NextResponse.json({ error: 'studentId and testId are required' }, { status: 400 });
  }

  const visible = await isStudentVisibleToViewer(userId, role, studentId);
  if (!visible) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const state = await getAdaptiveSession(studentId, testId);
  if (!state) {
    return NextResponse.json({ error: 'Session not found or expired' }, { status: 404 });
  }

  const correctCount = state.answers.filter((a) => a.isCorrect).length;

  const { score } = await finalizeAdaptiveTest(
    testId,
    state.subjectId,
    state.answers.map((a) => ({
      bankQuestionId: a.bankQuestionId,
      studentAnswer: a.studentAnswer,
      isCorrect: a.isCorrect,
    })),
    state.currentMastery,
  );

  await deleteAdaptiveSession(studentId, testId);

  return NextResponse.json({
    finalScore: score,
    finalMastery: state.currentMastery,
    totalQuestions: state.answeredCount,
    correctCount,
  });
}
