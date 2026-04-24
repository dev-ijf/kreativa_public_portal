import { sql } from '@/lib/db/client';

export type PortalAgendaRow = {
  id: string;
  schoolId: number;
  targetGrade: string | null;
  eventDate: string;
  titleEn: string;
  titleId: string;
  timeRange: string | null;
  eventType: string;
  schoolName: string;
};

function normalizeEventDate(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'string') return value.slice(0, 10);
  return String(value ?? '');
}

/** Agenda rows for schools linked to the viewer's active students (parent or student). Grade filter is applied on the client per selected child. */
export async function getAgendasForPortal(
  viewerUserId: number,
  viewerRole: string,
): Promise<PortalAgendaRow[]> {
  if (viewerRole === 'parent') {
    const rows = await sql`
      SELECT
        a.id::text        AS "id",
        a.school_id      AS "schoolId",
        a.target_grade   AS "targetGrade",
        a.event_date     AS "eventDate",
        a.title_en       AS "titleEn",
        a.title_id       AS "titleId",
        a.time_range     AS "timeRange",
        a.event_type     AS "eventType",
        sc.name          AS "schoolName"
      FROM academic_agendas a
      JOIN core_schools sc ON sc.id = a.school_id
      WHERE EXISTS (
        SELECT 1
        FROM core_students s
        JOIN core_parent_student_relations r ON r.student_id = s.id AND r.user_id = ${viewerUserId}
        WHERE s.school_id = a.school_id
          AND s.enrollment_status = 'active'
      )
      ORDER BY a.event_date ASC, a.id ASC
    `;
    return (rows as Record<string, unknown>[]).map((r) => ({
      id: String(r.id),
      schoolId: r.schoolId as number,
      targetGrade: (r.targetGrade as string | null) ?? null,
      eventDate: normalizeEventDate(r.eventDate),
      titleEn: r.titleEn as string,
      titleId: r.titleId as string,
      timeRange: (r.timeRange as string | null) ?? null,
      eventType: r.eventType as string,
      schoolName: r.schoolName as string,
    }));
  }

  if (viewerRole === 'student') {
    const rows = await sql`
      SELECT
        a.id::text        AS "id",
        a.school_id      AS "schoolId",
        a.target_grade   AS "targetGrade",
        a.event_date     AS "eventDate",
        a.title_en       AS "titleEn",
        a.title_id       AS "titleId",
        a.time_range     AS "timeRange",
        a.event_type     AS "eventType",
        sc.name          AS "schoolName"
      FROM academic_agendas a
      JOIN core_schools sc ON sc.id = a.school_id
      WHERE EXISTS (
        SELECT 1
        FROM core_students s
        WHERE s.school_id = a.school_id
          AND s.user_id = ${viewerUserId}
          AND s.enrollment_status = 'active'
      )
      ORDER BY a.event_date ASC, a.id ASC
    `;
    return (rows as Record<string, unknown>[]).map((r) => ({
      id: String(r.id),
      schoolId: r.schoolId as number,
      targetGrade: (r.targetGrade as string | null) ?? null,
      eventDate: normalizeEventDate(r.eventDate),
      titleEn: r.titleEn as string,
      titleId: r.titleId as string,
      timeRange: (r.timeRange as string | null) ?? null,
      eventType: r.eventType as string,
      schoolName: r.schoolName as string,
    }));
  }

  return [];
}
