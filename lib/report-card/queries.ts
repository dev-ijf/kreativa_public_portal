import { sql } from '@/lib/db/client';
import {
  computeAverage,
  computeFinalGrade,
  numericToLetter,
  isLetterOutputLevel,
  type GradingMethod,
} from './grading';

/* ──────────────────────────────  Types  ────────────────────────────── */

export type IndicatorRow = {
  id: number;
  learning_area_id: number;
  area_code: string;
  area_name: string;
  area_sort: number;
  section_id: number | null;
  section_name: string | null;
  section_sort: number | null;
  indicator_code: string | null;
  indicator_text: string;
  sort_order: number;
};

export type TermReportFull = {
  card: {
    id: number;
    school_id: number;
    student_id: number;
    class_id: number;
    academic_year_id: number;
    term_id: number;
    level_grade_id: number;
    report_date: string | null;
    total_school_days: number | null;
    days_present: number | null;
    days_sick: number | null;
    days_permitted: number | null;
    days_absent: number | null;
    days_late: number | null;
    weight_kg: number | null;
    height_cm: number | null;
    narrative_religion: string | null;
    narrative_identity: string | null;
    narrative_literacy_stem: string | null;
    narrative_cocurricular: string | null;
    teacher_remarks_strength: string | null;
    teacher_remarks_improve: string | null;
    teacher_remarks_en: string | null;
    teacher_remarks_final: string | null;
    cocurricular_remarks: string | null;
    homeroom_comment: string | null;
    teacher_remarks: string | null;
    parent_reflection: string | null;
    status: 'draft' | 'published';
    published_at: string | null;
    pdf_url: string | null;
  };
  context: {
    student_name: string;
    student_nis: string;
    student_photo_url: string | null;
    class_name: string;
    level_name: string;
    level_fase: string | null;
    school_name: string;
    school_logo_url: string | null;
    school_address: string | null;
    school_tagline: string | null;
    school_phone: string | null;
    school_email: string | null;
    school_website: string | null;
    principal_name: string | null;
    homeroom_teacher: string | null;
    homeroom_teachers: string[];
    academic_year_name: string;
    term_name: string;
    term_number: number;
    indicator_pattern: number;
    cover_letter_body: string | null;
  };
  theme_units: Array<{ theme: string; unit: string }>;
  indicators: Array<IndicatorRow & { score: string | null; notes: string | null }>;
};

export type SemesterReportFull = {
  card: {
    id: number;
    school_id: number;
    student_id: number;
    class_id: number;
    academic_year_id: number;
    term_id: number;
    level_grade_id: number;
    semester_number: number;
    report_date: string | null;
    total_school_days: number | null;
    days_present: number | null;
    days_sick: number | null;
    days_permitted: number | null;
    days_absent: number | null;
    days_late: number | null;
    cocurricular_remarks: string | null;
    homeroom_comment: string | null;
    conduct_remarks: string | null;
    status: 'draft' | 'published';
    published_at: string | null;
  };
  context: {
    student_name: string;
    student_nis: string;
    student_photo_url: string | null;
    class_name: string;
    level_name: string;
    level_fase: string | null;
    school_name: string;
    school_logo_url: string | null;
    school_address: string | null;
    school_tagline: string | null;
    school_phone: string | null;
    school_email: string | null;
    school_website: string | null;
    principal_name: string | null;
    homeroom_teacher: string | null;
    academic_year_name: string;
    term_name: string;
    semester_number: number;
    cover_letter_body: string | null;
  };
  grades: Array<{
    id: number;
    subject_config_id: number;
    subject_id: number;
    subject_code: string;
    subject_name: string;
    tests_per_semester: number;
    grading_method: GradingMethod;
    top_n_value: number | null;
    top_n_from: number | null;
    grade_output: 'letter' | 'number';
    fa_weight: number;
    sa_weight: number;
    has_semester_assessment: boolean;
    average_test: number | null;
    semester_assessment: number | null;
    final_grade_numeric: number | null;
    final_grade_letter: string | null;
    year_overall: number | null;
    remarks_id: string | null;
    remarks_en: string | null;
  }>;
  special: Array<{
    id: number | null;
    subject_id: number;
    subject_code: string;
    subject_name: string;
    jilid: string | null;
    page: string | null;
    shield: string | null;
    grade: string | null;
    remarks: string | null;
  }>;
};

/* ──────────────────────────  Helpers  ────────────────────────── */

function s(v: unknown): string {
  return v == null ? '' : String(v);
}
function nOrNull(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/* ─────────────────────────  Indicators by term  ───────────────────────── */

export async function loadIndicatorsForTerm(
  termId: number,
  levelGradeId: number
): Promise<IndicatorRow[]> {
  const rows = (await sql`
    SELECT
      ai.id,
      ai.learning_area_id,
      la.code AS area_code,
      la.name AS area_name,
      la.sort_order AS area_sort,
      la.section_id,
      ls.name AS section_name,
      ls.sort_order AS section_sort,
      ai.indicator_code,
      ai.indicator_text,
      ai.sort_order
    FROM rpt_assessment_indicators ai
    JOIN rpt_learning_areas la ON la.id = ai.learning_area_id
    LEFT JOIN rpt_learning_sections ls ON ls.id = la.section_id
    JOIN rpt_terms t ON t.academic_year_id = ai.academic_year_id
                   AND t.indicator_pattern = ai.indicator_pattern
    WHERE t.id = ${termId}
      AND la.level_grade_id = ${levelGradeId}
      AND ai.is_active = true
    ORDER BY ls.sort_order NULLS FIRST, la.sort_order, ai.sort_order, ai.id
  `) as Array<Record<string, unknown>>;

  return rows.map((r) => ({
    id: Number(r.id),
    learning_area_id: Number(r.learning_area_id),
    area_code: s(r.area_code),
    area_name: s(r.area_name),
    area_sort: Number(r.area_sort ?? 0),
    section_id: nOrNull(r.section_id),
    section_name: r.section_name == null ? null : s(r.section_name),
    section_sort: nOrNull(r.section_sort),
    indicator_code: r.indicator_code == null ? null : s(r.indicator_code),
    indicator_text: s(r.indicator_text),
    sort_order: Number(r.sort_order ?? 0),
  }));
}

/* ─────────────────────────  Term report card  ───────────────────────── */

export async function loadTermReportFull(reportId: number): Promise<TermReportFull | null> {
  const [card] = (await sql`
    SELECT rc.*, st.full_name AS student_name, st.nis AS student_nis, st.photo_url AS student_photo_url,
      c.name AS class_name, lg.name AS level_name, lg.fase AS level_fase,
      sch.name AS school_name, sch.school_logo_url, sch.address AS school_address,
      sch.tagline AS school_tagline, sch.phone AS school_phone,
      sch.email AS school_email, sch.website AS school_website,
      sch.principal_name AS principal_name,
      ay.name AS academic_year_name,
      t.name AS term_name, t.term_number, t.indicator_pattern,
      hu.full_name AS homeroom_teacher_name
    FROM rpt_term_report_cards rc
    JOIN core_students st ON st.id = rc.student_id
    JOIN core_classes c ON c.id = rc.class_id
    JOIN core_level_grades lg ON lg.id = rc.level_grade_id
    JOIN core_schools sch ON sch.id = rc.school_id
    JOIN core_academic_years ay ON ay.id = rc.academic_year_id
    JOIN rpt_terms t ON t.id = rc.term_id
    LEFT JOIN core_teacher_class_assignments tca
           ON tca.class_id = rc.class_id
          AND tca.academic_year_id = rc.academic_year_id
          AND tca.assignment_role = 'homeroom'
    LEFT JOIN core_users hu ON hu.id = tca.user_id
    WHERE rc.id = ${reportId}
    LIMIT 1
  `) as Array<Record<string, unknown>>;

  if (!card) return null;

  const indicators = await loadIndicatorsForTerm(
    Number(card.term_id),
    Number(card.level_grade_id)
  );

  const scores = (await sql`
    SELECT indicator_id, score, notes
    FROM rpt_term_report_scores
    WHERE report_card_id = ${reportId}
  `) as Array<Record<string, unknown>>;

  const scoreMap = new Map<number, { score: string | null; notes: string | null }>();
  for (const r of scores) {
    scoreMap.set(Number(r.indicator_id), {
      score: r.score == null ? null : s(r.score),
      notes: r.notes == null ? null : s(r.notes),
    });
  }

  const tuRows = (await sql`
    SELECT theme, unit
    FROM rpt_theme_units
    WHERE school_id = ${Number(card.school_id)}
      AND academic_year_id = ${Number(card.academic_year_id)}
      AND term_id = ${Number(card.term_id)}
      AND level_grade_id = ${Number(card.level_grade_id)}
    ORDER BY id
  `) as Array<Record<string, unknown>>;

  const htRows = (await sql`
    SELECT hu.full_name
    FROM core_teacher_class_assignments tca
    JOIN core_users hu ON hu.id = tca.user_id
    WHERE tca.class_id = ${Number(card.class_id)}
      AND tca.academic_year_id = ${Number(card.academic_year_id)}
      AND tca.assignment_role = 'homeroom'
    ORDER BY tca.id
  `) as Array<Record<string, unknown>>;
  const hoomroomTeachers = htRows.map((r) => s(r.full_name)).filter(Boolean);

  const [clRow] = (await sql`
    SELECT body FROM rpt_cover_letters
    WHERE school_id = ${Number(card.school_id)}
      AND academic_year_id = ${Number(card.academic_year_id)}
      AND term_id = ${Number(card.term_id)}
    LIMIT 1
  `) as Array<Record<string, unknown>>;
  const coverLetterBody = clRow ? s(clRow.body) : null;

  return {
    card: {
      id: Number(card.id),
      school_id: Number(card.school_id),
      student_id: Number(card.student_id),
      class_id: Number(card.class_id),
      academic_year_id: Number(card.academic_year_id),
      term_id: Number(card.term_id),
      level_grade_id: Number(card.level_grade_id),
      report_date: card.report_date == null ? null : s(card.report_date),
      total_school_days: nOrNull(card.total_school_days),
      days_present: nOrNull(card.days_present),
      days_sick: nOrNull(card.days_sick),
      days_permitted: nOrNull(card.days_permitted),
      days_absent: nOrNull(card.days_absent),
      days_late: nOrNull(card.days_late),
      weight_kg: nOrNull(card.weight_kg),
      height_cm: nOrNull(card.height_cm),
      narrative_religion: card.narrative_religion == null ? null : s(card.narrative_religion),
      narrative_identity: card.narrative_identity == null ? null : s(card.narrative_identity),
      narrative_literacy_stem:
        card.narrative_literacy_stem == null ? null : s(card.narrative_literacy_stem),
      narrative_cocurricular:
        card.narrative_cocurricular == null ? null : s(card.narrative_cocurricular),
      teacher_remarks_strength:
        card.teacher_remarks_strength == null ? null : s(card.teacher_remarks_strength),
      teacher_remarks_improve:
        card.teacher_remarks_improve == null ? null : s(card.teacher_remarks_improve),
      teacher_remarks_en: card.teacher_remarks_en == null ? null : s(card.teacher_remarks_en),
      teacher_remarks_final:
        card.teacher_remarks_final == null ? null : s(card.teacher_remarks_final),
      cocurricular_remarks: card.cocurricular_remarks == null ? null : s(card.cocurricular_remarks),
      homeroom_comment: card.homeroom_comment == null ? null : s(card.homeroom_comment),
      teacher_remarks: card.teacher_remarks == null ? null : s(card.teacher_remarks),
      parent_reflection: card.parent_reflection == null ? null : s(card.parent_reflection),
      status: (s(card.status) as 'draft' | 'published') || 'draft',
      published_at: card.published_at == null ? null : s(card.published_at),
      pdf_url: card.pdf_url == null ? null : s(card.pdf_url),
    },
    context: {
      student_name: s(card.student_name),
      student_nis: s(card.student_nis),
      student_photo_url: card.student_photo_url == null ? null : s(card.student_photo_url),
      class_name: s(card.class_name),
      level_name: s(card.level_name),
      level_fase: card.level_fase == null ? null : s(card.level_fase),
      school_name: s(card.school_name),
      school_logo_url: card.school_logo_url == null ? null : s(card.school_logo_url),
      school_address: card.school_address == null ? null : s(card.school_address),
      school_tagline: card.school_tagline == null ? null : s(card.school_tagline),
      school_phone: card.school_phone == null ? null : s(card.school_phone),
      school_email: card.school_email == null ? null : s(card.school_email),
      school_website: card.school_website == null ? null : s(card.school_website),
      principal_name: card.principal_name == null ? null : s(card.principal_name),
      homeroom_teacher: hoomroomTeachers[0] ?? null,
      homeroom_teachers: hoomroomTeachers,
      academic_year_name: s(card.academic_year_name),
      term_name: s(card.term_name),
      term_number: Number(card.term_number ?? 0),
      indicator_pattern: Number(card.indicator_pattern ?? 0),
      cover_letter_body: coverLetterBody,
    },
    theme_units: tuRows.map((r) => ({ theme: s(r.theme), unit: s(r.unit) })),
    indicators: indicators.map((i) => {
      const sm = scoreMap.get(i.id);
      return { ...i, score: sm?.score ?? null, notes: sm?.notes ?? null };
    }),
  };
}

/* ─────────────────────────  Semester report card  ───────────────────────── */

export async function loadSemesterReportFull(
  reportId: number
): Promise<SemesterReportFull | null> {
  const [card] = (await sql`
    SELECT rc.*, st.full_name AS student_name, st.nis AS student_nis, st.photo_url AS student_photo_url,
      c.name AS class_name, lg.name AS level_name, lg.fase AS level_fase,
      sch.name AS school_name, sch.school_logo_url, sch.address AS school_address,
      sch.tagline AS school_tagline, sch.phone AS school_phone,
      sch.email AS school_email, sch.website AS school_website,
      sch.principal_name AS principal_name,
      ay.name AS academic_year_name,
      t.name AS term_name,
      hu.full_name AS homeroom_teacher_name
    FROM rpt_semester_report_cards rc
    JOIN core_students st ON st.id = rc.student_id
    JOIN core_classes c ON c.id = rc.class_id
    JOIN core_level_grades lg ON lg.id = rc.level_grade_id
    JOIN core_schools sch ON sch.id = rc.school_id
    JOIN core_academic_years ay ON ay.id = rc.academic_year_id
    JOIN rpt_terms t ON t.id = rc.term_id
    LEFT JOIN core_teacher_class_assignments tca
           ON tca.class_id = rc.class_id
          AND tca.academic_year_id = rc.academic_year_id
          AND tca.assignment_role = 'homeroom'
    LEFT JOIN core_users hu ON hu.id = tca.user_id
    WHERE rc.id = ${reportId}
    LIMIT 1
  `) as Array<Record<string, unknown>>;

  if (!card) return null;

  const grades = (await sql`
    SELECT sg.*, sc.subject_id, sc.tests_per_semester, sc.grading_method, sc.top_n_value, sc.top_n_from,
      sc.grade_output, sc.fa_weight, sc.sa_weight, sc.has_semester_assessment,
      sub.code AS subject_code, sub.name AS subject_name, sub.sort_order AS subject_sort
    FROM rpt_semester_grades sg
    JOIN rpt_subject_configs sc ON sc.id = sg.subject_config_id
    JOIN rpt_subjects sub ON sub.id = sc.subject_id
    WHERE sg.semester_report_card_id = ${reportId}
    ORDER BY sub.sort_order, sub.id
  `) as Array<Record<string, unknown>>;

  const special = (await sql`
    SELECT sg.*, sub.code AS subject_code, sub.name AS subject_name
    FROM rpt_subjects sub
    LEFT JOIN rpt_special_subject_grades sg
           ON sg.subject_id = sub.id AND sg.semester_report_card_id = ${reportId}
    WHERE sub.subject_type = 'special' AND sub.school_id = ${Number(card.school_id)}
    ORDER BY sub.sort_order, sub.id
  `) as Array<Record<string, unknown>>;

  const [semClRow] = (await sql`
    SELECT body FROM rpt_cover_letters
    WHERE school_id = ${Number(card.school_id)}
      AND academic_year_id = ${Number(card.academic_year_id)}
      AND term_id = ${Number(card.term_id)}
    LIMIT 1
  `) as Array<Record<string, unknown>>;
  const semCoverLetterBody = semClRow ? s(semClRow.body) : null;

  return {
    card: {
      id: Number(card.id),
      school_id: Number(card.school_id),
      student_id: Number(card.student_id),
      class_id: Number(card.class_id),
      academic_year_id: Number(card.academic_year_id),
      term_id: Number(card.term_id),
      level_grade_id: Number(card.level_grade_id),
      semester_number: Number(card.semester_number ?? 1),
      report_date: card.report_date == null ? null : s(card.report_date),
      total_school_days: nOrNull(card.total_school_days),
      days_present: nOrNull(card.days_present),
      days_sick: nOrNull(card.days_sick),
      days_permitted: nOrNull(card.days_permitted),
      days_absent: nOrNull(card.days_absent),
      days_late: nOrNull(card.days_late),
      cocurricular_remarks: card.cocurricular_remarks == null ? null : s(card.cocurricular_remarks),
      homeroom_comment: card.homeroom_comment == null ? null : s(card.homeroom_comment),
      conduct_remarks: card.conduct_remarks == null ? null : s(card.conduct_remarks),
      status: (s(card.status) as 'draft' | 'published') || 'draft',
      published_at: card.published_at == null ? null : s(card.published_at),
    },
    context: {
      student_name: s(card.student_name),
      student_nis: s(card.student_nis),
      student_photo_url: card.student_photo_url == null ? null : s(card.student_photo_url),
      class_name: s(card.class_name),
      level_name: s(card.level_name),
      level_fase: card.level_fase == null ? null : s(card.level_fase),
      school_name: s(card.school_name),
      school_logo_url: card.school_logo_url == null ? null : s(card.school_logo_url),
      school_address: card.school_address == null ? null : s(card.school_address),
      school_tagline: card.school_tagline == null ? null : s(card.school_tagline),
      school_phone: card.school_phone == null ? null : s(card.school_phone),
      school_email: card.school_email == null ? null : s(card.school_email),
      school_website: card.school_website == null ? null : s(card.school_website),
      principal_name: card.principal_name == null ? null : s(card.principal_name),
      homeroom_teacher: card.homeroom_teacher_name == null ? null : s(card.homeroom_teacher_name),
      academic_year_name: s(card.academic_year_name),
      term_name: s(card.term_name),
      semester_number: Number(card.semester_number ?? 1),
      cover_letter_body: semCoverLetterBody,
    },
    grades: grades.map((g) => ({
      id: Number(g.id),
      subject_config_id: Number(g.subject_config_id),
      subject_id: Number(g.subject_id),
      subject_code: s(g.subject_code),
      subject_name: s(g.subject_name),
      tests_per_semester: Number(g.tests_per_semester ?? 0),
      grading_method: (s(g.grading_method) as GradingMethod) || 'average',
      top_n_value: nOrNull(g.top_n_value),
      top_n_from: nOrNull(g.top_n_from),
      grade_output: (s(g.grade_output) as 'letter' | 'number') || 'letter',
      fa_weight: Number(g.fa_weight ?? 0.4),
      sa_weight: Number(g.sa_weight ?? 0.6),
      has_semester_assessment: g.has_semester_assessment !== false,
      average_test: nOrNull(g.average_test),
      semester_assessment: nOrNull(g.semester_assessment),
      final_grade_numeric: nOrNull(g.final_grade_numeric),
      final_grade_letter: g.final_grade_letter == null ? null : s(g.final_grade_letter),
      year_overall: nOrNull(g.year_overall),
      remarks_id: g.remarks_id == null ? null : s(g.remarks_id),
      remarks_en: g.remarks_en == null ? null : s(g.remarks_en),
    })),
    special: special.map((g) => ({
      id: g.id == null ? null : Number(g.id),
      subject_id: Number(g.subject_id),
      subject_code: s(g.subject_code),
      subject_name: s(g.subject_name),
      jilid: g.jilid == null ? null : s(g.jilid),
      page: g.page == null ? null : s(g.page),
      shield: g.shield == null ? null : s(g.shield),
      grade: g.grade == null ? null : s(g.grade),
      remarks: g.remarks == null ? null : s(g.remarks),
    })),
  };
}
