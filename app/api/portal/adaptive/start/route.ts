import { NextResponse } from 'next/server';
import { getCachedServerSession } from '@/lib/auth-cached';
import {
  isStudentVisibleToViewer,
  getGradeBandForStudent,
  getLastMastery,
  getLifetimeCorrectIds,
  getActiveEnrollmentContextForStudent,
  createAdaptiveTest,
  fetchNextIRTQuestion,
} from '@/lib/data/server/adaptive';
import { createAdaptiveSession } from '@/lib/cache/adaptive-session';
import { isValidGradeBand } from '@/lib/utils/grade-bands';

const DEFAULT_QUESTION_COUNT = 10;

export async function POST(request: Request) {
  const [session, body] = await Promise.all([
    getCachedServerSession(),
    request.json().catch(() => null),
  ]);

  const userId = session?.user?.userId;
  const role = session?.user?.role ?? '';

  if (userId == null) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { studentId, subjectId, gradeBand: requestedBand } = body as {
    studentId?: number; subjectId?: number; gradeBand?: string;
  };
  if (!studentId || !subjectId) {
    return NextResponse.json({ error: 'studentId and subjectId are required' }, { status: 400 });
  }

  if (requestedBand != null && !isValidGradeBand(requestedBand)) {
    return NextResponse.json({ error: 'Invalid gradeBand value' }, { status: 400 });
  }

  const [visible, detectedBand, initialMastery, correctQuestionIds, enrollment] = await Promise.all([
    isStudentVisibleToViewer(userId, role, studentId),
    getGradeBandForStudent(studentId),
    getLastMastery(studentId, subjectId),
    getLifetimeCorrectIds(studentId, subjectId),
    getActiveEnrollmentContextForStudent(studentId),
  ]);

  if (!visible) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const gradeBand = requestedBand ?? detectedBand;

  const question = await fetchNextIRTQuestion(
    subjectId,
    gradeBand,
    initialMastery,
    correctQuestionIds,
    [],
  );

  if (!question) {
    return NextResponse.json(
      { error: 'No questions available for your level.', code: 'NO_QUESTIONS' },
      { status: 404 },
    );
  }

  const testId = await createAdaptiveTest(studentId, subjectId, initialMastery, enrollment);

  createAdaptiveSession({
    studentId,
    testId,
    subjectId,
    gradeBand,
    currentMastery: initialMastery,
    correctQuestionIds,
    sessionQuestionIds: [question.id],
    answers: [],
    questionCount: DEFAULT_QUESTION_COUNT,
    answeredCount: 0,
  });

  return NextResponse.json({
    testId,
    gradeBand,
    currentMastery: initialMastery,
    questionCount: DEFAULT_QUESTION_COUNT,
    question,
  });
}
