import { NextResponse } from 'next/server';
import { getCachedServerSession } from '@/lib/auth-cached';
import {
  isStudentVisibleToViewer,
  getGradeBandForStudent,
  getLastMastery,
  getLifetimeCorrectIds,
  createAdaptiveTest,
  fetchNextIRTQuestion,
} from '@/lib/data/server/adaptive';
import { createAdaptiveSession, updateAdaptiveSession } from '@/lib/cache/adaptive-session';

const DEFAULT_QUESTION_COUNT = 10;

export async function POST(request: Request) {
  const session = await getCachedServerSession();
  const userId = session?.user?.userId;
  const role = session?.user?.role ?? '';

  if (userId == null) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { studentId?: number; subjectId?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { studentId, subjectId } = body;
  if (!studentId || !subjectId) {
    return NextResponse.json({ error: 'studentId and subjectId are required' }, { status: 400 });
  }

  const visible = await isStudentVisibleToViewer(userId, role, studentId);
  if (!visible) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const gradeBand = await getGradeBandForStudent(studentId);
  const initialMastery = await getLastMastery(studentId, subjectId);
  const correctQuestionIds = await getLifetimeCorrectIds(studentId, subjectId);

  const testId = await createAdaptiveTest(studentId, subjectId, initialMastery);

  await createAdaptiveSession({
    studentId,
    testId,
    subjectId,
    gradeBand,
    currentMastery: initialMastery,
    correctQuestionIds,
    sessionQuestionIds: [],
    answers: [],
    questionCount: DEFAULT_QUESTION_COUNT,
    answeredCount: 0,
  });

  const question = await fetchNextIRTQuestion(
    subjectId,
    gradeBand,
    initialMastery,
    correctQuestionIds,
    [],
  );

  if (question) {
    await updateAdaptiveSession(studentId, testId, {
      sessionQuestionIds: [question.id],
    });
  }

  return NextResponse.json({
    testId,
    gradeBand,
    currentMastery: initialMastery,
    questionCount: DEFAULT_QUESTION_COUNT,
    question,
  });
}
