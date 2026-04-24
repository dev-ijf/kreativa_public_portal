import { sql } from '@/lib/db/client';

export type PortalScheduleRow = {
  id: string;
  classId: number;
  academicYearId: number;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  isBreak: boolean;
  subjectNameEn: string | null;
  subjectNameId: string | null;
  teacherName: string | null;
};

function mapRow(r: Record<string, unknown>): PortalScheduleRow {
  return {
    id: String(r.id),
    classId: r.classId as number,
    academicYearId: r.academicYearId as number,
    dayOfWeek: String(r.dayOfWeek ?? ''),
    startTime: String(r.startTime ?? ''),
    endTime: String(r.endTime ?? ''),
    isBreak: Boolean(r.isBreak),
    subjectNameEn: (r.subjectNameEn as string | null) ?? null,
    subjectNameId: (r.subjectNameId as string | null) ?? null,
    teacherName: (r.teacherName as string | null) ?? null,
  };
}

/**
 * Weekly schedule rows for class+year combinations linked to the viewer's active enrollments.
 */
export async function getSchedulesForPortal(
  viewerUserId: number,
  viewerRole: string,
): Promise<PortalScheduleRow[]> {
  if (viewerRole === 'parent') {
    const rows = await sql`
      SELECT
        sch.id::text              AS "id",
        sch.class_id            AS "classId",
        sch.academic_year_id    AS "academicYearId",
        sch.day_of_week         AS "dayOfWeek",
        sch.start_time          AS "startTime",
        sch.end_time            AS "endTime",
        sch.is_break            AS "isBreak",
        subj.name_en            AS "subjectNameEn",
        subj.name_id            AS "subjectNameId",
        u.full_name             AS "teacherName"
      FROM academic_schedules sch
      LEFT JOIN academic_subjects subj ON subj.id = sch.subject_id
      LEFT JOIN core_teachers t ON t.id = sch.teacher_id
      LEFT JOIN core_users u ON u.id = t.user_id
      WHERE EXISTS (
        SELECT 1
        FROM core_students s
        JOIN core_parent_student_relations r ON r.student_id = s.id AND r.user_id = ${viewerUserId}
        JOIN core_student_class_histories h
          ON h.student_id = s.id
         AND h.status = 'active'
         AND h.class_id = sch.class_id
         AND h.academic_year_id = sch.academic_year_id
        WHERE s.enrollment_status = 'active'
      )
      ORDER BY
        CASE LOWER(TRIM(sch.day_of_week))
          WHEN 'senin' THEN 1 WHEN 'monday' THEN 1
          WHEN 'selasa' THEN 2 WHEN 'tuesday' THEN 2
          WHEN 'rabu' THEN 3 WHEN 'wednesday' THEN 3
          WHEN 'kamis' THEN 4 WHEN 'thursday' THEN 4
          WHEN 'jumat' THEN 5 WHEN 'friday' THEN 5
          WHEN 'sabtu' THEN 6 WHEN 'saturday' THEN 6
          WHEN 'minggu' THEN 7 WHEN 'sunday' THEN 7
          ELSE 99
        END,
        sch.start_time ASC,
        sch.id ASC
    `;
    return (rows as Record<string, unknown>[]).map(mapRow);
  }

  if (viewerRole === 'student') {
    const rows = await sql`
      SELECT
        sch.id::text              AS "id",
        sch.class_id            AS "classId",
        sch.academic_year_id    AS "academicYearId",
        sch.day_of_week         AS "dayOfWeek",
        sch.start_time          AS "startTime",
        sch.end_time            AS "endTime",
        sch.is_break            AS "isBreak",
        subj.name_en            AS "subjectNameEn",
        subj.name_id            AS "subjectNameId",
        u.full_name             AS "teacherName"
      FROM academic_schedules sch
      LEFT JOIN academic_subjects subj ON subj.id = sch.subject_id
      LEFT JOIN core_teachers t ON t.id = sch.teacher_id
      LEFT JOIN core_users u ON u.id = t.user_id
      WHERE EXISTS (
        SELECT 1
        FROM core_students s
        JOIN core_student_class_histories h
          ON h.student_id = s.id
         AND h.status = 'active'
         AND h.class_id = sch.class_id
         AND h.academic_year_id = sch.academic_year_id
        WHERE s.user_id = ${viewerUserId}
          AND s.enrollment_status = 'active'
      )
      ORDER BY
        CASE LOWER(TRIM(sch.day_of_week))
          WHEN 'senin' THEN 1 WHEN 'monday' THEN 1
          WHEN 'selasa' THEN 2 WHEN 'tuesday' THEN 2
          WHEN 'rabu' THEN 3 WHEN 'wednesday' THEN 3
          WHEN 'kamis' THEN 4 WHEN 'thursday' THEN 4
          WHEN 'jumat' THEN 5 WHEN 'friday' THEN 5
          WHEN 'sabtu' THEN 6 WHEN 'saturday' THEN 6
          WHEN 'minggu' THEN 7 WHEN 'sunday' THEN 7
          ELSE 99
        END,
        sch.start_time ASC,
        sch.id ASC
    `;
    return (rows as Record<string, unknown>[]).map(mapRow);
  }

  return [];
}
