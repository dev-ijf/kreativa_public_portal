import { sql } from '@/lib/db/client';

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────

export type BankQuestion = {
  id: number;
  subjectId: number;
  gradeBand: string;
  difficulty: number;
  questionText: string;
  optionsJson: string[];
  correctAnswer: string;
  explanation: string | null;
  hintsJson: string[] | null;
  subTopic: string | null;
  bloomsTaxonomy: string | null;
};

export type AdaptiveHistoryRow = {
  id: number;
  subjectId: number;
  subjectNameEn: string;
  subjectNameId: string;
  testDate: string;
  score: number;
  masteryLevel: number;
};

export type AdaptiveHistoryDetailRow = {
  testId: number;
  studentName: string;
  subjectNameEn: string;
  subjectNameId: string;
  score: number;
  masteryLevel: number;
  testDate: string;
};

export type AdaptiveHistoryQuestionRow = {
  id: number;
  gradeBand: string;
  difficulty: number;
  questionText: string;
  optionsJson: string[];
  correctAnswer: string;
  studentAnswer: string | null;
  explanation: string | null;
  hintsJson: string[] | null;
};

export type SubjectRow = {
  id: number;
  code: string;
  nameEn: string;
  nameId: string;
  colorTheme: string | null;
};

// ────────────────────────────────────────────────────────────────
// Grade Band Mapping
// ────────────────────────────────────────────────────────────────

function levelOrderToGradeBand(levelOrder: number): string {
  if (levelOrder <= 0) return 'TK';
  if (levelOrder <= 3) return 'g1-3';
  if (levelOrder <= 6) return 'g4-6';
  if (levelOrder <= 9) return 'g7-9';
  return 'g10-12';
}

export async function getGradeBandForStudent(studentId: number): Promise<string> {
  const rows = await sql`
    SELECT lg.level_order AS "levelOrder"
    FROM core_students s
    LEFT JOIN LATERAL (
      SELECT ch.level_grade_id
      FROM core_student_class_histories ch
      WHERE ch.student_id = s.id AND ch.status = 'active'
      ORDER BY ch.id DESC
      LIMIT 1
    ) h ON true
    LEFT JOIN core_level_grades lg ON lg.id = h.level_grade_id
    WHERE s.id = ${studentId}
    LIMIT 1
  `;
  if (!rows.length || (rows[0] as { levelOrder: number | null }).levelOrder == null) return 'g4-6';
  return levelOrderToGradeBand(Number((rows[0] as { levelOrder: number }).levelOrder));
}

// ────────────────────────────────────────────────────────────────
// IRT: Mastery Lookup
// ────────────────────────────────────────────────────────────────

export async function getLastMastery(studentId: number, subjectId: number): Promise<number> {
  const rows = await sql`
    SELECT mastery_level AS "masteryLevel"
    FROM academic_adaptive_tests
    WHERE student_id = ${studentId} AND subject_id = ${subjectId}
    ORDER BY test_date DESC
    LIMIT 1
  `;
  if (!rows.length) return 0.5;
  return Number((rows[0] as { masteryLevel: number }).masteryLevel);
}

// ────────────────────────────────────────────────────────────────
// IRT: Lifetime correct bank_question_ids
// ────────────────────────────────────────────────────────────────

export async function getLifetimeCorrectIds(studentId: number, subjectId: number): Promise<number[]> {
  const rows = await sql`
    SELECT DISTINCT q.bank_question_id AS "bankQuestionId"
    FROM academic_adaptive_questions q
    JOIN academic_adaptive_tests t ON q.adaptive_test_id = t.id
    JOIN academic_adaptive_questions_bank b ON b.id = q.bank_question_id
    WHERE t.student_id = ${studentId}
      AND q.subject_id = ${subjectId}
      AND q.bank_question_id IS NOT NULL
      AND q.student_answer = b.correct_answer
  `;
  return (rows as { bankQuestionId: number }[])
    .map((r) => r.bankQuestionId)
    .filter((v) => v != null);
}

// ────────────────────────────────────────────────────────────────
// IRT: Fetch Next Question
// ────────────────────────────────────────────────────────────────

export async function fetchNextIRTQuestion(
  subjectId: number,
  gradeBand: string,
  theta: number,
  correctQuestionIds: number[],
  sessionQuestionIds: number[],
): Promise<BankQuestion | null> {
  const excludeCorrect = correctQuestionIds.length > 0 ? correctQuestionIds : [0];
  const excludeSession = sessionQuestionIds.length > 0 ? sessionQuestionIds : [0];

  const rows = await sql`
    SELECT
      bank.id,
      bank.subject_id        AS "subjectId",
      bank.grade_band        AS "gradeBand",
      bank.difficulty,
      bank.question_text     AS "questionText",
      bank.options_json      AS "optionsJson",
      bank.correct_answer    AS "correctAnswer",
      bank.explanation,
      bank.hints_json        AS "hintsJson",
      bank.sub_topic         AS "subTopic",
      bank.blooms_taxonomy   AS "bloomsTaxonomy"
    FROM academic_adaptive_questions_bank bank
    WHERE bank.subject_id = ${subjectId}
      AND bank.grade_band = ${gradeBand}
      AND bank.is_approved = true
      AND bank.id NOT IN (SELECT unnest(${excludeCorrect}::int8[]))
      AND bank.id NOT IN (SELECT unnest(${excludeSession}::int8[]))
    ORDER BY ABS(bank.difficulty - ${theta}) ASC, RANDOM()
    LIMIT 1
  `;

  if (!rows.length) return null;

  const r = rows[0] as Record<string, unknown>;
  return {
    id: Number(r.id),
    subjectId: Number(r.subjectId),
    gradeBand: String(r.gradeBand),
    difficulty: Number(r.difficulty),
    questionText: String(r.questionText),
    optionsJson: r.optionsJson as string[],
    correctAnswer: String(r.correctAnswer),
    explanation: r.explanation ? String(r.explanation) : null,
    hintsJson: r.hintsJson as string[] | null,
    subTopic: r.subTopic ? String(r.subTopic) : null,
    bloomsTaxonomy: r.bloomsTaxonomy ? String(r.bloomsTaxonomy) : null,
  };
}

// ────────────────────────────────────────────────────────────────
// IRT: Mastery Update (1PL Rasch Model)
// ────────────────────────────────────────────────────────────────

const LEARNING_RATE = 0.1;

export function computeNewMastery(theta: number, difficulty: number, isCorrect: boolean): number {
  const pCorrect = 1 / (1 + Math.exp(-1.7 * (theta - difficulty)));
  const delta = LEARNING_RATE * ((isCorrect ? 1 : 0) - pCorrect);
  return Math.max(0, Math.min(1, theta + delta));
}

// ────────────────────────────────────────────────────────────────
// Create Test Row
// ────────────────────────────────────────────────────────────────

export async function createAdaptiveTest(
  studentId: number,
  subjectId: number,
  initialMastery: number,
): Promise<number> {
  const rows = await sql`
    INSERT INTO academic_adaptive_tests (student_id, subject_id, score, mastery_level)
    VALUES (${studentId}, ${subjectId}, 0, ${initialMastery})
    RETURNING id
  `;
  return Number((rows[0] as { id: number }).id);
}

// ────────────────────────────────────────────────────────────────
// Finalize Test (bulk insert answers + update score)
// ────────────────────────────────────────────────────────────────

export type AnswerRecord = {
  bankQuestionId: number;
  studentAnswer: string;
  isCorrect: boolean;
};

export async function finalizeAdaptiveTest(
  testId: number,
  subjectId: number,
  answers: AnswerRecord[],
  finalMastery: number,
): Promise<{ score: number }> {
  const correctCount = answers.filter((a) => a.isCorrect).length;
  const score = answers.length > 0 ? Math.round((correctCount / answers.length) * 100) : 0;

  await sql`UPDATE academic_adaptive_tests SET score = ${score}, mastery_level = ${finalMastery} WHERE id = ${testId}`;

  for (const ans of answers) {
    const bankRow = await sql`
      SELECT subject_id, grade_band, difficulty, question_text, options_json, correct_answer, explanation
      FROM academic_adaptive_questions_bank WHERE id = ${ans.bankQuestionId}
    `;
    if (!bankRow.length) continue;
    const b = bankRow[0] as Record<string, unknown>;

    await sql`
      INSERT INTO academic_adaptive_questions
        (subject_id, grade_band, difficulty, question_text, options_json, correct_answer, explanation, adaptive_test_id, student_answer, bank_question_id)
      VALUES
        (${b.subject_id}, ${b.grade_band}, ${b.difficulty}, ${b.question_text}, ${JSON.stringify(b.options_json)}, ${b.correct_answer}, ${b.explanation}, ${testId}, ${ans.studentAnswer}, ${ans.bankQuestionId})
    `;
  }

  return { score };
}

// ────────────────────────────────────────────────────────────────
// Correct Answer Lookup (single bank question)
// ────────────────────────────────────────────────────────────────

export async function getBankQuestionCorrectAnswer(bankQuestionId: number): Promise<string | null> {
  const rows = await sql`
    SELECT correct_answer AS "correctAnswer"
    FROM academic_adaptive_questions_bank
    WHERE id = ${bankQuestionId}
  `;
  if (!rows.length) return null;
  return String((rows[0] as { correctAnswer: string }).correctAnswer);
}

// ────────────────────────────────────────────────────────────────
// History: List (paginated)
// ────────────────────────────────────────────────────────────────

function mapHistoryRows(rows: unknown[]): AdaptiveHistoryRow[] {
  return rows.map((row) => {
    const r = row as Record<string, unknown>;
    const td = r.testDate;
    return {
      id: Number(r.id),
      subjectId: Number(r.subjectId),
      subjectNameEn: String(r.subjectNameEn),
      subjectNameId: String(r.subjectNameId),
      score: Number(r.score),
      masteryLevel: Number(r.masteryLevel),
      testDate: td instanceof Date ? td.toISOString() : String(td),
    };
  });
}

export async function getAdaptiveHistory(studentId: number): Promise<AdaptiveHistoryRow[]> {
  const rows = await sql`
    SELECT
      t.id,
      t.subject_id    AS "subjectId",
      s.name_en        AS "subjectNameEn",
      s.name_id        AS "subjectNameId",
      t.test_date      AS "testDate",
      t.score,
      t.mastery_level  AS "masteryLevel"
    FROM academic_adaptive_tests t
    JOIN academic_subjects s ON s.id = t.subject_id
    WHERE t.student_id = ${studentId}
    ORDER BY t.test_date DESC, t.id DESC
  `;
  return mapHistoryRows(rows as unknown[]);
}

export async function getAdaptiveHistoryPage(
  studentId: number,
  limit: number,
  offset: number,
): Promise<AdaptiveHistoryRow[]> {
  const rows = await sql`
    SELECT
      t.id,
      t.subject_id    AS "subjectId",
      s.name_en        AS "subjectNameEn",
      s.name_id        AS "subjectNameId",
      t.test_date      AS "testDate",
      t.score,
      t.mastery_level  AS "masteryLevel"
    FROM academic_adaptive_tests t
    JOIN academic_subjects s ON s.id = t.subject_id
    WHERE t.student_id = ${studentId}
    ORDER BY t.test_date DESC, t.id DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
  return mapHistoryRows(rows as unknown[]);
}

export async function getAdaptiveHistoryStats(studentId: number): Promise<{
  totalTests: number;
  avgScore: number;
}> {
  const rows = await sql`
    SELECT
      COUNT(*)::int AS "totalTests",
      COALESCE(ROUND(AVG(score::numeric))::int, 0) AS "avgScore"
    FROM academic_adaptive_tests
    WHERE student_id = ${studentId}
  `;
  const r = rows[0] as { totalTests: number; avgScore: number } | undefined;
  return {
    totalTests: Number(r?.totalTests ?? 0),
    avgScore: Number(r?.avgScore ?? 0),
  };
}

// ────────────────────────────────────────────────────────────────
// History: Detail (test + questions)
// ────────────────────────────────────────────────────────────────

export async function getAdaptiveTestDetail(
  testId: number,
  viewerStudentId: number,
): Promise<{ test: AdaptiveHistoryDetailRow; questions: AdaptiveHistoryQuestionRow[] } | null> {
  const testRows = await sql`
    SELECT
      t.id                AS "testId",
      st.full_name        AS "studentName",
      s.name_en           AS "subjectNameEn",
      s.name_id           AS "subjectNameId",
      t.score,
      t.mastery_level     AS "masteryLevel",
      t.test_date         AS "testDate"
    FROM academic_adaptive_tests t
    JOIN academic_subjects s ON s.id = t.subject_id
    JOIN core_students st ON st.id = t.student_id
    WHERE t.id = ${testId} AND t.student_id = ${viewerStudentId}
  `;
  if (!testRows.length) return null;

  const test = testRows[0] as Record<string, unknown>;
  const testDate = test.testDate instanceof Date
    ? test.testDate.toISOString()
    : String(test.testDate);

  const qRows = await sql`
    SELECT
      q.id,
      q.grade_band       AS "gradeBand",
      q.difficulty,
      COALESCE(b.question_text, q.question_text) AS "questionText",
      COALESCE(b.options_json, q.options_json)    AS "optionsJson",
      COALESCE(b.correct_answer, q.correct_answer) AS "correctAnswer",
      q.student_answer   AS "studentAnswer",
      COALESCE(b.explanation, q.explanation) AS "explanation",
      b.hints_json       AS "hintsJson"
    FROM academic_adaptive_questions q
    LEFT JOIN academic_adaptive_questions_bank b ON b.id = q.bank_question_id
    WHERE q.adaptive_test_id = ${testId}
    ORDER BY q.id ASC
  `;

  return {
    test: {
      testId: Number(test.testId),
      studentName: String(test.studentName),
      subjectNameEn: String(test.subjectNameEn),
      subjectNameId: String(test.subjectNameId),
      score: Number(test.score),
      masteryLevel: Number(test.masteryLevel),
      testDate,
    },
    questions: (qRows as Record<string, unknown>[]).map((q) => ({
      id: Number(q.id),
      gradeBand: String(q.gradeBand),
      difficulty: Number(q.difficulty),
      questionText: String(q.questionText),
      optionsJson: q.optionsJson as string[],
      correctAnswer: String(q.correctAnswer),
      studentAnswer: q.studentAnswer ? String(q.studentAnswer) : null,
      explanation: q.explanation ? String(q.explanation) : null,
      hintsJson: q.hintsJson as string[] | null,
    })),
  };
}

// ────────────────────────────────────────────────────────────────
// Subjects List
// ────────────────────────────────────────────────────────────────

export async function getAdaptiveSubjects(): Promise<SubjectRow[]> {
  const rows = await sql`
    SELECT id, code, name_en AS "nameEn", name_id AS "nameId", color_theme AS "colorTheme"
    FROM academic_subjects
    ORDER BY id ASC
  `;
  return (rows as SubjectRow[]).map((r) => ({
    ...r,
    id: Number(r.id),
  }));
}

// ────────────────────────────────────────────────────────────────
// Mastery per subject (latest test per subject for a student)
// ────────────────────────────────────────────────────────────────

export async function getMasteryPerSubject(
  studentId: number,
): Promise<Record<number, number>> {
  const rows = await sql`
    SELECT DISTINCT ON (subject_id)
      subject_id AS "subjectId",
      mastery_level AS "masteryLevel"
    FROM academic_adaptive_tests
    WHERE student_id = ${studentId}
    ORDER BY subject_id, test_date DESC
  `;
  const map: Record<number, number> = {};
  for (const r of rows as { subjectId: number; masteryLevel: number }[]) {
    map[Number(r.subjectId)] = Number(r.masteryLevel);
  }
  return map;
}

// ────────────────────────────────────────────────────────────────
// Visibility check (reuse pattern from attendance)
// ────────────────────────────────────────────────────────────────

export async function isStudentVisibleToViewer(
  viewerUserId: number,
  viewerRole: string,
  studentId: number,
): Promise<boolean> {
  if (viewerRole === 'parent') {
    const rows = await sql`
      SELECT EXISTS (
        SELECT 1
        FROM core_parent_student_relations r
        JOIN core_students s ON s.id = r.student_id
        WHERE r.user_id = ${viewerUserId}
          AND s.id = ${studentId}
          AND s.enrollment_status = 'active'
      ) AS ok
    `;
    return Boolean((rows[0] as { ok?: boolean })?.ok);
  }
  if (viewerRole === 'student') {
    const rows = await sql`
      SELECT EXISTS (
        SELECT 1
        FROM core_students s
        WHERE s.user_id = ${viewerUserId}
          AND s.id = ${studentId}
          AND s.enrollment_status = 'active'
      ) AS ok
    `;
    return Boolean((rows[0] as { ok?: boolean })?.ok);
  }
  return false;
}
