import { sql } from '@/lib/db/client';
import type {
  PortalLmsMaterial,
  PortalLmsSession,
  PortalLmsWeeklyPlanBundle,
} from '@/lib/portal/lms-weekly-plan-types';
import type { PortalWeekConfig } from '@/lib/portal/weekly-plan-types';
import { computeDefaultDayIndex } from '@/lib/portal/weekly-plan-utils';

export type {
  PortalLmsMaterial,
  PortalLmsSession,
  PortalLmsWeeklyPlanBundle,
} from '@/lib/portal/lms-weekly-plan-types';

type Enrollment = {
  studentId: number;
  schoolId: number;
  classId: number;
  academicYearId: number;
};

function normalizeDate(value: unknown): string {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const parsed = Date.parse(trimmed);
    if (!Number.isNaN(parsed)) {
      return calendarDateInJakarta(new Date(parsed));
    }
    return trimmed.slice(0, 10);
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return calendarDateInJakarta(value);
  }
  return String(value ?? '').slice(0, 10);
}

function calendarDateInJakarta(dt: Date): string {
  const shifted = new Date(dt.getTime() + 7 * 60 * 60 * 1000);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const d = String(shifted.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function normalizeTime(value: unknown): string | null {
  if (value == null || value === '') return null;
  const raw = String(value);
  const m = raw.match(/(\d{2}):(\d{2})/);
  if (m) return `${m[1]}:${m[2]}`;
  if (value instanceof Date) {
    const hh = String(value.getUTCHours()).padStart(2, '0');
    const mm = String(value.getUTCMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }
  return raw;
}

/** Day index Mon=0 … Fri=4 from week start; -1 if outside Mon–Fri window. */
function dayIndexFromWeekStart(dateFrom: string, sessionDate: string): number {
  const [y1, m1, d1] = dateFrom.split('-').map(Number);
  const [y2, m2, d2] = sessionDate.split('-').map(Number);
  if (!y1 || !m1 || !d1 || !y2 || !m2 || !d2) return -1;
  const a = Date.UTC(y1, m1 - 1, d1);
  const b = Date.UTC(y2, m2 - 1, d2);
  const diff = Math.round((b - a) / 86_400_000);
  if (diff < 0 || diff > 4) return -1;
  return diff;
}

async function getViewerEnrollments(
  viewerUserId: number,
  viewerRole: string,
): Promise<Enrollment[]> {
  if (viewerRole === 'parent') {
    const rows = await sql`
      SELECT
        s.id AS "studentId",
        s.school_id AS "schoolId",
        h.class_id AS "classId",
        h.academic_year_id AS "academicYearId"
      FROM core_parent_student_relations r
      JOIN core_students s ON s.id = r.student_id
      JOIN LATERAL (
        SELECT ch.class_id, ch.academic_year_id
        FROM core_student_class_histories ch
        WHERE ch.student_id = s.id AND ch.status = 'active'
        ORDER BY ch.id DESC
        LIMIT 1
      ) h ON true
      WHERE r.user_id = ${viewerUserId}
        AND s.enrollment_status = 'active'
        AND h.class_id IS NOT NULL
        AND h.academic_year_id IS NOT NULL
      ORDER BY s.id ASC
    `;
    return (rows as Record<string, unknown>[]).map((r) => ({
      studentId: Number(r.studentId),
      schoolId: Number(r.schoolId),
      classId: Number(r.classId),
      academicYearId: Number(r.academicYearId),
    }));
  }

  if (viewerRole === 'student') {
    const rows = await sql`
      SELECT
        s.id AS "studentId",
        s.school_id AS "schoolId",
        h.class_id AS "classId",
        h.academic_year_id AS "academicYearId"
      FROM core_students s
      JOIN LATERAL (
        SELECT ch.class_id, ch.academic_year_id
        FROM core_student_class_histories ch
        WHERE ch.student_id = s.id AND ch.status = 'active'
        ORDER BY ch.id DESC
        LIMIT 1
      ) h ON true
      WHERE s.user_id = ${viewerUserId}
        AND s.enrollment_status = 'active'
        AND h.class_id IS NOT NULL
        AND h.academic_year_id IS NOT NULL
      ORDER BY s.id ASC
    `;
    return (rows as Record<string, unknown>[]).map((r) => ({
      studentId: Number(r.studentId),
      schoolId: Number(r.schoolId),
      classId: Number(r.classId),
      academicYearId: Number(r.academicYearId),
    }));
  }

  return [];
}

async function resolveWeekConfig(
  schoolId: number,
  academicYearId: number,
): Promise<PortalWeekConfig | null> {
  const rows = await sql`
    SELECT
      id,
      week_number AS "weekNumber",
      week_label AS "weekLabel",
      date_from::text AS "dateFrom",
      date_to::text AS "dateTo"
    FROM wl_week_configs
    WHERE school_id = ${schoolId}
      AND academic_year_id = ${academicYearId}
      AND is_active = true
    ORDER BY
      CASE
        WHEN date_from <= CURRENT_DATE AND date_to >= CURRENT_DATE THEN 0
        WHEN date_from > CURRENT_DATE THEN 1
        ELSE 2
      END,
      CASE WHEN date_from > CURRENT_DATE THEN date_from END ASC NULLS LAST,
      CASE WHEN date_to < CURRENT_DATE THEN date_to END DESC NULLS LAST
    LIMIT 1
  `;
  const r = rows[0] as Record<string, unknown> | undefined;
  if (!r) return null;
  return {
    id: Number(r.id),
    weekNumber: Number(r.weekNumber),
    weekLabel: (r.weekLabel as string | null) ?? null,
    dateFrom: normalizeDate(r.dateFrom),
    dateTo: normalizeDate(r.dateTo),
  };
}

function materialUrl(
  externalUrl: string | null | undefined,
  filePath: string | null | undefined,
): string | null {
  const ext = externalUrl?.trim();
  if (ext) return ext;
  const path = filePath?.trim();
  if (path) return path;
  return null;
}

async function loadMaterialsForSessions(
  sessionIds: number[],
): Promise<Map<number, PortalLmsMaterial[]>> {
  const bySession = new Map<number, PortalLmsMaterial[]>();
  if (sessionIds.length === 0) return bySession;

  const rows = await sql`
    SELECT
      id,
      session_id AS "sessionId",
      title,
      material_type AS "materialType",
      file_path AS "filePath",
      file_name AS "fileName",
      mime_type AS "mimeType",
      external_url AS "externalUrl",
      sort_order AS "sortOrder"
    FROM lms_session_materials
    WHERE session_id = ANY(${sessionIds}::int8[])
    ORDER BY sort_order ASC, id ASC
  `;

  for (const raw of rows as Record<string, unknown>[]) {
    const sessionId = Number(raw.sessionId);
    const list = bySession.get(sessionId) ?? [];
    list.push({
      id: Number(raw.id),
      title: String(raw.title ?? ''),
      materialType: String(raw.materialType ?? 'document'),
      fileName: (raw.fileName as string | null) ?? null,
      url: materialUrl(
        raw.externalUrl as string | null,
        raw.filePath as string | null,
      ),
      mimeType: (raw.mimeType as string | null) ?? null,
    });
    bySession.set(sessionId, list);
  }

  return bySession;
}

async function loadSessionsForWeek(
  studentId: number,
  schoolId: number,
  academicYearId: number,
  week: PortalWeekConfig,
): Promise<PortalLmsSession[]> {
  const rows = await sql`
    SELECT
      s.id,
      s.course_id AS "courseId",
      s.title,
      s.description,
      s.learning_objectives AS "learningObjectives",
      s.session_date::text AS "sessionDate",
      s.start_time AS "startTime",
      s.end_time AS "endTime",
      s.period_number AS "periodNumber",
      sub.name AS "subjectName",
      s.pre_learning_enabled AS "preEnabled",
      s.pre_learning_type AS "preType",
      s.pre_learning_minutes AS "preMinutes",
      s.pre_learning_instructions AS "preInstructions",
      s.pre_learning_url AS "preUrl",
      s.pre_learning_file_path AS "preFilePath",
      s.pre_learning_file_name AS "preFileName",
      s.post_learning_enabled AS "postEnabled",
      s.post_learning_type AS "postType",
      s.post_learning_minutes AS "postMinutes",
      s.post_learning_instructions AS "postInstructions",
      s.post_learning_url AS "postUrl",
      s.post_learning_file_path AS "postFilePath",
      s.post_learning_file_name AS "postFileName"
    FROM lms_sessions s
    JOIN lms_courses c ON c.id = s.course_id
    JOIN lms_subjects sub ON sub.id = c.subject_id
    JOIN lms_course_enrollments ce
      ON ce.course_id = c.id AND ce.student_id = ${studentId}
    WHERE c.school_id = ${schoolId}
      AND c.academic_year_id = ${academicYearId}
      AND ce.status = 'active'
      AND c.deleted_at IS NULL
      AND (
        s.week_config_id = ${week.id}
        OR (
          s.week_config_id IS NULL
          AND s.session_date BETWEEN ${week.dateFrom}::date AND ${week.dateTo}::date
        )
      )
    ORDER BY
      s.session_date ASC,
      s.start_time ASC NULLS LAST,
      s.period_number ASC NULLS LAST,
      s.id ASC
  `;

  const sessionRows = rows as Record<string, unknown>[];
  const sessionIds = sessionRows.map((r) => Number(r.id));
  const materialsBySession = await loadMaterialsForSessions(sessionIds);

  return sessionRows.map((r) => {
    const sessionDate = normalizeDate(r.sessionDate);
    const preEnabled = Boolean(r.preEnabled);
    const postEnabled = Boolean(r.postEnabled);
    return {
      id: Number(r.id),
      courseId: Number(r.courseId),
      subjectName: String(r.subjectName ?? ''),
      title: String(r.title ?? ''),
      learningObjectives: (r.learningObjectives as string | null) ?? null,
      descriptionHtml: (r.description as string | null) ?? null,
      sessionDate,
      dayIndex: dayIndexFromWeekStart(week.dateFrom, sessionDate),
      startTime: normalizeTime(r.startTime),
      endTime: normalizeTime(r.endTime),
      periodNumber:
        r.periodNumber != null && r.periodNumber !== ''
          ? Number(r.periodNumber)
          : null,
      materials: materialsBySession.get(Number(r.id)) ?? [],
      preLearning: preEnabled
        ? {
            enabled: true,
            type: (r.preType as string | null) ?? null,
            minutes:
              r.preMinutes != null && r.preMinutes !== ''
                ? Number(r.preMinutes)
                : null,
            instructions: (r.preInstructions as string | null) ?? null,
            url: (r.preUrl as string | null) ?? null,
            fileName: (r.preFileName as string | null) ?? null,
            filePath: (r.preFilePath as string | null) ?? null,
          }
        : null,
      postLearning: postEnabled
        ? {
            enabled: true,
            type: (r.postType as string | null) ?? null,
            minutes:
              r.postMinutes != null && r.postMinutes !== ''
                ? Number(r.postMinutes)
                : null,
            instructions: (r.postInstructions as string | null) ?? null,
            url: (r.postUrl as string | null) ?? null,
            fileName: (r.postFileName as string | null) ?? null,
            filePath: (r.postFilePath as string | null) ?? null,
          }
        : null,
    };
  });
}

/**
 * LMS weekly sessions for Secondary/HS schedule page.
 * Week from wl_week_configs; lessons from lms_sessions + materials.
 */
export async function getLmsWeeklyPlansForPortal(
  viewerUserId: number,
  viewerRole: string,
): Promise<PortalLmsWeeklyPlanBundle[]> {
  const enrollments = await getViewerEnrollments(viewerUserId, viewerRole);
  if (enrollments.length === 0) return [];

  const weekCache = new Map<string, PortalWeekConfig | null>();
  const out: PortalLmsWeeklyPlanBundle[] = [];

  for (const en of enrollments) {
    const weekKey = `${en.schoolId}:${en.academicYearId}`;
    let week = weekCache.get(weekKey);
    if (week === undefined) {
      week = await resolveWeekConfig(en.schoolId, en.academicYearId);
      weekCache.set(weekKey, week);
    }

    if (!week) {
      out.push({
        studentId: en.studentId,
        schoolId: en.schoolId,
        classId: en.classId,
        academicYearId: en.academicYearId,
        week: null,
        defaultDayIndex: 0,
        sessions: [],
      });
      continue;
    }

    const sessions = await loadSessionsForWeek(
      en.studentId,
      en.schoolId,
      en.academicYearId,
      week,
    );

    out.push({
      studentId: en.studentId,
      schoolId: en.schoolId,
      classId: en.classId,
      academicYearId: en.academicYearId,
      week,
      defaultDayIndex: computeDefaultDayIndex(week.dateFrom, week.dateTo),
      sessions,
    });
  }

  return out;
}
