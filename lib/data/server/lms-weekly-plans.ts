import { sql } from '@/lib/db/client';
import { isStudentVisibleToViewer } from '@/lib/data/server/attendance';
import {
  getWeekAdjacency,
  getWeekConfigById,
  normalizeWeekDate,
  resolveAdjacentWeekConfig,
  resolveCurrentWeekConfig,
  type WeekDirection,
} from '@/lib/data/server/week-configs';
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
  return normalizeWeekDate(value);
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

async function buildLmsBundleForEnrollment(
  en: Enrollment,
  week: PortalWeekConfig,
): Promise<PortalLmsWeeklyPlanBundle> {
  const [sessions, adjacency] = await Promise.all([
    loadSessionsForWeek(en.studentId, en.schoolId, en.academicYearId, week),
    getWeekAdjacency(en.schoolId, en.academicYearId, week.id),
  ]);
  return {
    studentId: en.studentId,
    schoolId: en.schoolId,
    classId: en.classId,
    academicYearId: en.academicYearId,
    week,
    defaultDayIndex: computeDefaultDayIndex(week.dateFrom, week.dateTo),
    hasPrevWeek: adjacency.hasPrevWeek,
    hasNextWeek: adjacency.hasNextWeek,
    sessions,
  };
}

function emptyLmsBundle(en: Enrollment): PortalLmsWeeklyPlanBundle {
  return {
    studentId: en.studentId,
    schoolId: en.schoolId,
    classId: en.classId,
    academicYearId: en.academicYearId,
    week: null,
    defaultDayIndex: 0,
    hasPrevWeek: false,
    hasNextWeek: false,
    sessions: [],
  };
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
      week = await resolveCurrentWeekConfig(en.schoolId, en.academicYearId);
      weekCache.set(weekKey, week);
    }

    if (!week) {
      out.push(emptyLmsBundle(en));
      continue;
    }

    out.push(await buildLmsBundleForEnrollment(en, week));
  }

  return out;
}

export type GetLmsWeeklyPlanWeekResult =
  | { ok: true; bundle: PortalLmsWeeklyPlanBundle }
  | { ok: false; reason: 'forbidden' | 'missing_class' | 'no_week' | 'bad_request' };

/**
 * Load LMS sessions for one student at a specific week,
 * or the previous/next adjacent week when `direction` is set.
 */
export async function getLmsWeeklyPlanForPortalStudentWeek(
  viewerUserId: number,
  viewerRole: string,
  studentId: number,
  weekConfigId: number,
  direction?: WeekDirection | null,
): Promise<GetLmsWeeklyPlanWeekResult> {
  if (!Number.isFinite(studentId) || !Number.isFinite(weekConfigId)) {
    return { ok: false, reason: 'bad_request' };
  }

  const visible = await isStudentVisibleToViewer(viewerUserId, viewerRole, studentId);
  if (!visible) return { ok: false, reason: 'forbidden' };

  const enrollments = await getViewerEnrollments(viewerUserId, viewerRole);
  const en = enrollments.find((e) => e.studentId === studentId);
  if (!en) return { ok: false, reason: 'missing_class' };

  let week: PortalWeekConfig | null;
  if (direction === 'prev' || direction === 'next') {
    week = await resolveAdjacentWeekConfig(
      en.schoolId,
      en.academicYearId,
      weekConfigId,
      direction,
    );
  } else {
    week = await getWeekConfigById(weekConfigId);
    if (week) {
      const owned = await sql`
        SELECT 1
        FROM wl_week_configs
        WHERE id = ${week.id}
          AND school_id = ${en.schoolId}
          AND academic_year_id = ${en.academicYearId}
        LIMIT 1
      `;
      if (owned.length === 0) week = null;
    }
  }

  if (!week) return { ok: false, reason: 'no_week' };
  return { ok: true, bundle: await buildLmsBundleForEnrollment(en, week) };
}
