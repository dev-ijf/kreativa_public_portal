import { sql } from '@/lib/db/client';

export type TermReportListItem = {
  id: number;
  studentId: number;
  studentName: string;
  studentNis: string;
  className: string;
  levelName: string;
  termName: string;
  termNumber: number;
  academicYearName: string;
  reportDate: string | null;
  publishedAt: string | null;
};

export type SemesterReportListItem = {
  id: number;
  studentId: number;
  studentName: string;
  studentNis: string;
  className: string;
  levelName: string;
  termName: string;
  semesterNumber: number;
  academicYearName: string;
  reportDate: string | null;
  publishedAt: string | null;
};

export async function getPublishedTermReports(
  userId: number,
  role: string
): Promise<TermReportListItem[]> {
  let rows: Array<Record<string, unknown>>;

  if (role === 'parent') {
    rows = (await sql`
      SELECT
        rc.id,
        rc.student_id AS "studentId",
        st.full_name AS "studentName",
        st.nis AS "studentNis",
        c.name AS "className",
        lg.name AS "levelName",
        t.name AS "termName",
        t.term_number AS "termNumber",
        ay.name AS "academicYearName",
        rc.report_date AS "reportDate",
        rc.published_at AS "publishedAt"
      FROM rpt_term_report_cards rc
      JOIN core_students st ON st.id = rc.student_id
      JOIN core_parent_student_relations r ON r.student_id = st.id
      JOIN rpt_terms t ON t.id = rc.term_id
      JOIN core_academic_years ay ON ay.id = rc.academic_year_id
      JOIN core_classes c ON c.id = rc.class_id
      JOIN core_level_grades lg ON lg.id = rc.level_grade_id
      WHERE r.user_id = ${userId}
        AND rc.status = 'published'
      ORDER BY rc.published_at DESC, t.term_number DESC
    `) as Array<Record<string, unknown>>;
  } else {
    rows = (await sql`
      SELECT
        rc.id,
        rc.student_id AS "studentId",
        st.full_name AS "studentName",
        st.nis AS "studentNis",
        c.name AS "className",
        lg.name AS "levelName",
        t.name AS "termName",
        t.term_number AS "termNumber",
        ay.name AS "academicYearName",
        rc.report_date AS "reportDate",
        rc.published_at AS "publishedAt"
      FROM rpt_term_report_cards rc
      JOIN core_students st ON st.id = rc.student_id
      JOIN rpt_terms t ON t.id = rc.term_id
      JOIN core_academic_years ay ON ay.id = rc.academic_year_id
      JOIN core_classes c ON c.id = rc.class_id
      JOIN core_level_grades lg ON lg.id = rc.level_grade_id
      WHERE st.user_id = ${userId}
        AND rc.status = 'published'
      ORDER BY rc.published_at DESC, t.term_number DESC
    `) as Array<Record<string, unknown>>;
  }

  return rows as unknown as TermReportListItem[];
}

export async function getPublishedSemesterReports(
  userId: number,
  role: string
): Promise<SemesterReportListItem[]> {
  let rows: Array<Record<string, unknown>>;

  if (role === 'parent') {
    rows = (await sql`
      SELECT
        rc.id,
        rc.student_id AS "studentId",
        st.full_name AS "studentName",
        st.nis AS "studentNis",
        c.name AS "className",
        lg.name AS "levelName",
        t.name AS "termName",
        rc.semester_number AS "semesterNumber",
        ay.name AS "academicYearName",
        rc.report_date AS "reportDate",
        rc.published_at AS "publishedAt"
      FROM rpt_semester_report_cards rc
      JOIN core_students st ON st.id = rc.student_id
      JOIN core_parent_student_relations r ON r.student_id = st.id
      JOIN rpt_terms t ON t.id = rc.term_id
      JOIN core_academic_years ay ON ay.id = rc.academic_year_id
      JOIN core_classes c ON c.id = rc.class_id
      JOIN core_level_grades lg ON lg.id = rc.level_grade_id
      WHERE r.user_id = ${userId}
        AND rc.status = 'published'
      ORDER BY rc.published_at DESC, rc.semester_number DESC
    `) as Array<Record<string, unknown>>;
  } else {
    rows = (await sql`
      SELECT
        rc.id,
        rc.student_id AS "studentId",
        st.full_name AS "studentName",
        st.nis AS "studentNis",
        c.name AS "className",
        lg.name AS "levelName",
        t.name AS "termName",
        rc.semester_number AS "semesterNumber",
        ay.name AS "academicYearName",
        rc.report_date AS "reportDate",
        rc.published_at AS "publishedAt"
      FROM rpt_semester_report_cards rc
      JOIN core_students st ON st.id = rc.student_id
      JOIN rpt_terms t ON t.id = rc.term_id
      JOIN core_academic_years ay ON ay.id = rc.academic_year_id
      JOIN core_classes c ON c.id = rc.class_id
      JOIN core_level_grades lg ON lg.id = rc.level_grade_id
      WHERE st.user_id = ${userId}
        AND rc.status = 'published'
      ORDER BY rc.published_at DESC, rc.semester_number DESC
    `) as Array<Record<string, unknown>>;
  }

  return rows as unknown as SemesterReportListItem[];
}

export async function isReportOwnedByUser(
  userId: number,
  role: string,
  studentId: number
): Promise<boolean> {
  if (role === 'parent') {
    const rows = await sql`
      SELECT EXISTS (
        SELECT 1
        FROM core_parent_student_relations r
        JOIN core_students s ON s.id = r.student_id
        WHERE r.user_id = ${userId}
          AND s.id = ${studentId}
          AND s.enrollment_status = 'active'
      ) AS ok
    `;
    return Boolean((rows[0] as { ok?: boolean })?.ok);
  }
  if (role === 'student') {
    const rows = await sql`
      SELECT EXISTS (
        SELECT 1
        FROM core_students s
        WHERE s.user_id = ${userId}
          AND s.id = ${studentId}
          AND s.enrollment_status = 'active'
      ) AS ok
    `;
    return Boolean((rows[0] as { ok?: boolean })?.ok);
  }
  return false;
}
