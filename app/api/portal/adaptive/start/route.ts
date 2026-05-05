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

  const [gradeBand, initialMastery, correctQuestionIds, enrollment] = await Promise.all([
    getGradeBandForStudent(studentId),
    getLastMastery(studentId, subjectId),
    getLifetimeCorrectIds(studentId, subjectId),
    getActiveEnrollmentContextForStudent(studentId),
  ]);

  // Hanya persist baris tes setelah ada soal — hindari baris "kosong" yang ikut
  // mastery per mapel, riwayat, dan statistik (total/avg score).
  const question = await fetchNextIRTQuestion(
    subjectId,
    gradeBand,
    initialMastery,
    correctQuestionIds,
    [],
  );

  if (!question) {
    return NextResponse.json(
      {
        error: 'No questions available for your level.',
        code: 'NO_QUESTIONS',
      },
      { status: 404 },
    );
  }

  const testId = await createAdaptiveTest(studentId, subjectId, initialMastery, enrollment);

  await createAdaptiveSession({
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
