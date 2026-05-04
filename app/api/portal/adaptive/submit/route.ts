import { NextResponse } from 'next/server';
import { getCachedServerSession } from '@/lib/auth-cached';
import {
  isStudentVisibleToViewer,
  computeNewMastery,
  fetchNextIRTQuestion,
} from '@/lib/data/server/adaptive';
import { sql } from '@/lib/db/client';
import { getAdaptiveSession, updateAdaptiveSession } from '@/lib/cache/adaptive-session';

export async function POST(request: Request) {
  const session = await getCachedServerSession();
  const userId = session?.user?.userId;
  const role = session?.user?.role ?? '';

  if (userId == null) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { studentId?: number; testId?: number; bankQuestionId?: number; studentAnswer?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { studentId, testId, bankQuestionId, studentAnswer } = body;
  if (!studentId || !testId || !bankQuestionId || studentAnswer == null) {
    return NextResponse.json(
      { error: 'studentId, testId, bankQuestionId, and studentAnswer are required' },
      { status: 400 },
    );
  }

  const visible = await isStudentVisibleToViewer(userId, role, studentId);
  if (!visible) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const state = await getAdaptiveSession(studentId, testId);
  if (!state) {
    return NextResponse.json({ error: 'Session not found or expired' }, { status: 404 });
  }

  const bankRows = await sql`
    SELECT correct_answer AS "correctAnswer", difficulty
    FROM academic_adaptive_questions_bank
    WHERE id = ${bankQuestionId}
  `;
  if (!bankRows.length) {
    return NextResponse.json({ error: 'Question not found in bank' }, { status: 404 });
  }

  const correctAnswer = String((bankRows[0] as { correctAnswer: string }).correctAnswer);
  const questionDifficulty = Number((bankRows[0] as { difficulty: number }).difficulty);

  const isCorrect = studentAnswer.trim() === correctAnswer.trim();

  const newMastery = computeNewMastery(state.currentMastery, questionDifficulty, isCorrect);

  const newCorrectIds = isCorrect
    ? [...state.correctQuestionIds, bankQuestionId]
    : state.correctQuestionIds;

  const newAnswers = [
    ...state.answers,
    { bankQuestionId, studentAnswer, isCorrect, difficulty: questionDifficulty },
  ];

  const newAnsweredCount = state.answeredCount + 1;
  const isFinished = newAnsweredCount >= state.questionCount;

  let nextQuestion = null;
  let updatedSessionQuestionIds = state.sessionQuestionIds;

  if (!isFinished) {
    nextQuestion = await fetchNextIRTQuestion(
      state.subjectId,
      state.gradeBand,
      newMastery,
      newCorrectIds,
      state.sessionQuestionIds,
    );
    if (nextQuestion) {
      updatedSessionQuestionIds = [...state.sessionQuestionIds, nextQuestion.id];
    }
  }

  await updateAdaptiveSession(studentId, testId, {
    currentMastery: newMastery,
    correctQuestionIds: newCorrectIds,
    sessionQuestionIds: updatedSessionQuestionIds,
    answers: newAnswers,
    answeredCount: newAnsweredCount,
  });

  return NextResponse.json({
    isCorrect,
    correctAnswer,
    updatedMastery: newMastery,
    answeredCount: newAnsweredCount,
    isFinished,
    nextQuestion,
  });
}
