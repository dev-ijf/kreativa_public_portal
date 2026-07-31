import { sql } from '@/lib/db/client';
import { getLmsWeeklyPlanForPortalStudentWeek } from '@/lib/data/server/lms-weekly-plans';
import { getWeeklyPlanForPortalStudentWeek } from '@/lib/data/server/weekly-plans';
import type { WeekDirection } from '@/lib/data/server/week-configs';
import { isSecondaryOrHighSchoolStudent } from '@/lib/portal/is-kindergarten';
import type { PortalLmsWeeklyPlanBundle } from '@/lib/portal/lms-weekly-plan-types';
import type { PortalWeeklyPlanBundle } from '@/lib/portal/weekly-plan-types';

export type PortalScheduleWeekResponse =
  | { source: 'wl'; bundle: PortalWeeklyPlanBundle }
  | { source: 'lms'; bundle: PortalLmsWeeklyPlanBundle };

export type GetPortalScheduleWeekResult =
  | { ok: true; data: PortalScheduleWeekResponse }
  | {
      ok: false;
      reason: 'forbidden' | 'missing_class' | 'no_week' | 'bad_request';
    };

async function loadStudentLevelHints(studentId: number): Promise<{
  levelGradeName: string | null;
  levelOrder: number | null;
  schoolName: string | null;
  className: string | null;
} | null> {
  const rows = await sql`
    SELECT
      lg.name AS "levelGradeName",
      lg.level_order AS "levelOrder",
      sc.name AS "schoolName",
      c.name AS "className"
    FROM core_students s
    JOIN core_schools sc ON sc.id = s.school_id
    LEFT JOIN LATERAL (
      SELECT ch.class_id, ch.level_grade_id
      FROM core_student_class_histories ch
      WHERE ch.student_id = s.id AND ch.status = 'active'
      ORDER BY ch.id DESC
      LIMIT 1
    ) h ON true
    LEFT JOIN core_classes c ON c.id = h.class_id
    LEFT JOIN core_level_grades lg ON lg.id = h.level_grade_id
    WHERE s.id = ${studentId}
      AND s.enrollment_status = 'active'
    LIMIT 1
  `;
  const r = rows[0] as Record<string, unknown> | undefined;
  if (!r) return null;
  return {
    levelGradeName: (r.levelGradeName as string | null) ?? null,
    levelOrder:
      r.levelOrder != null && r.levelOrder !== '' ? Number(r.levelOrder) : null,
    schoolName: (r.schoolName as string | null) ?? null,
    className: (r.className as string | null) ?? null,
  };
}

/**
 * Resolve schedule week payload for portal nav (prev/next or absolute week).
 * Secondary/HS → LMS sessions; KG/Primary → WL weekly plan.
 */
export async function getPortalScheduleWeek(
  viewerUserId: number,
  viewerRole: string,
  studentId: number,
  weekConfigId: number,
  direction?: WeekDirection | null,
): Promise<GetPortalScheduleWeekResult> {
  const hints = await loadStudentLevelHints(studentId);
  if (!hints) return { ok: false, reason: 'missing_class' };

  const useLms = isSecondaryOrHighSchoolStudent(hints);

  if (useLms) {
    const result = await getLmsWeeklyPlanForPortalStudentWeek(
      viewerUserId,
      viewerRole,
      studentId,
      weekConfigId,
      direction,
    );
    if (!result.ok) return result;
    return { ok: true, data: { source: 'lms', bundle: result.bundle } };
  }

  const result = await getWeeklyPlanForPortalStudentWeek(
    viewerUserId,
    viewerRole,
    studentId,
    weekConfigId,
    direction,
  );
  if (!result.ok) return result;
  return { ok: true, data: { source: 'wl', bundle: result.bundle } };
}
