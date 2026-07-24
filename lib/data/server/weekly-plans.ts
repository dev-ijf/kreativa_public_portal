import { sql } from '@/lib/db/client';
import { computeDefaultDayIndex } from '@/lib/portal/weekly-plan-utils';
import type {
  PortalWeekConfig,
  PortalWeeklyPlanBundle,
  PortalWeeklyPlanRow,
} from '@/lib/portal/weekly-plan-types';

export type {
  PortalWeekConfig,
  PortalWeeklyPlanBundle,
  PortalWeeklyPlanRow,
  PortalWeeklyPlanSlot,
} from '@/lib/portal/weekly-plan-types';

type Enrollment = {
  studentId: number;
  schoolId: number;
  classId: number;
  academicYearId: number;
};

function normalizeDate(value: unknown): string {
  if (value instanceof Date) {
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, '0');
    const d = String(value.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof value === 'string') return value.slice(0, 10);
  return String(value ?? '').slice(0, 10);
}

function normalizeTime(value: unknown): string {
  const raw = String(value ?? '');
  // "07:30:00" | "07:30:00.000" | Date → "07:30"
  const m = raw.match(/(\d{2}):(\d{2})/);
  if (m) return `${m[1]}:${m[2]}`;
  if (value instanceof Date) {
    const hh = String(value.getUTCHours()).padStart(2, '0');
    const mm = String(value.getUTCMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }
  return raw;
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
      date_from AS "dateFrom",
      date_to AS "dateTo"
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

/**
 * Load weekly plan for class + week. Prefer published; fall back to draft
 * so parents still see content before admin publishes.
 */
async function loadPlanForWeek(
  classId: number,
  weekConfigId: number,
): Promise<{
  plan: PortalWeeklyPlanBundle['plan'];
  rows: PortalWeeklyPlanRow[];
}> {
  const planRows = await sql`
    SELECT
      id,
      school_level AS "schoolLevel",
      weekly_theme AS "weeklyTheme",
      status
    FROM wl_weekly_plans
    WHERE class_id = ${classId}
      AND week_config_id = ${weekConfigId}
      AND status IN ('published', 'draft')
    ORDER BY
      CASE status WHEN 'published' THEN 0 ELSE 1 END,
      id DESC
    LIMIT 1
  `;
  const planRaw = planRows[0] as Record<string, unknown> | undefined;
  if (!planRaw) {
    return { plan: null, rows: [] };
  }

  const planId = Number(planRaw.id);
  const plan = {
    id: planId,
    schoolLevel: String(planRaw.schoolLevel ?? ''),
    weeklyTheme: (planRaw.weeklyTheme as string | null) ?? null,
  };

  const scheduleRows = await sql`
    SELECT
      r.id,
      r.row_type AS "rowType",
      r.time_start AS "timeStart",
      r.time_end AS "timeEnd",
      r.routine_description AS "routineDescription",
      r.subject_name AS "subjectName",
      r.category,
      r.sort_order AS "sortOrder",
      r.active_days AS "activeDays",
      s.day_index AS "dayIndex",
      s.topic AS "slotTopic",
      s.description AS "slotDescription",
      s.subject_name AS "slotSubjectName"
    FROM wl_schedule_rows r
    LEFT JOIN wl_schedule_slots s ON s.row_id = r.id
    WHERE r.weekly_plan_id = ${planId}
    ORDER BY r.sort_order ASC, r.time_start ASC, r.id ASC, s.day_index ASC NULLS LAST
  `;

  const byRow = new Map<number, PortalWeeklyPlanRow>();
  for (const raw of scheduleRows as Record<string, unknown>[]) {
    const rowId = Number(raw.id);
    let row = byRow.get(rowId);
    if (!row) {
      const rowTypeRaw = String(raw.rowType ?? 'routine');
      row = {
        id: rowId,
        rowType: rowTypeRaw === 'instructional' ? 'instructional' : 'routine',
        timeStart: normalizeTime(raw.timeStart),
        timeEnd: normalizeTime(raw.timeEnd),
        routineDescription: (raw.routineDescription as string | null) ?? null,
        subjectName: (raw.subjectName as string | null) ?? null,
        category: (raw.category as string | null) ?? null,
        sortOrder: Number(raw.sortOrder ?? 0),
        activeDays: String(raw.activeDays ?? 'mon,tue,wed,thu,fri'),
        slots: [],
      };
      byRow.set(rowId, row);
    }
    if (raw.dayIndex != null && raw.dayIndex !== '') {
      row.slots.push({
        dayIndex: Number(raw.dayIndex),
        topic: (raw.slotTopic as string | null) ?? null,
        description: (raw.slotDescription as string | null) ?? null,
        subjectName: (raw.slotSubjectName as string | null) ?? null,
      });
    }
  }

  return { plan, rows: Array.from(byRow.values()) };
}

/**
 * Weekly plans for the viewer's active enrollments,
 * with week resolved from today's date via wl_week_configs.
 * Prefers published plans; falls back to draft.
 */
export async function getWeeklyPlansForPortal(
  viewerUserId: number,
  viewerRole: string,
): Promise<PortalWeeklyPlanBundle[]> {
  const enrollments = await getViewerEnrollments(viewerUserId, viewerRole);
  if (enrollments.length === 0) return [];

  const weekCache = new Map<string, PortalWeekConfig | null>();
  const out: PortalWeeklyPlanBundle[] = [];

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
        plan: null,
        rows: [],
      });
      continue;
    }

    const { plan, rows } = await loadPlanForWeek(en.classId, week.id);
    out.push({
      studentId: en.studentId,
      schoolId: en.schoolId,
      classId: en.classId,
      academicYearId: en.academicYearId,
      week,
      defaultDayIndex: computeDefaultDayIndex(week.dateFrom, week.dateTo),
      plan,
      rows,
    });
  }

  return out;
}
