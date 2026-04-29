import { cache } from 'react';
import { sql } from '@/lib/db/client';

export type StudentChildRow = {
  id: number;
  schoolId: number;
  fullName: string;
  nickname: string | null;
  nis: string;
  photoUrl: string | null;
};

export async function getChildrenForUser(userId: number): Promise<StudentChildRow[]> {
  const rows = await sql`
    SELECT
      s.id,
      s.school_id AS "schoolId",
      s.full_name AS "fullName",
      s.nickname,
      s.nis,
      s.photo_url AS "photoUrl"
    FROM core_parent_student_relations r
    JOIN core_students s ON s.id = r.student_id
    WHERE r.user_id = ${userId}
    ORDER BY s.id ASC
  `;

  return rows as unknown as StudentChildRow[];
}

export type PortalChildRow = {
  id: number;
  schoolId: number;
  fullName: string;
  classId: number | null;
  className: string | null;
  academicYearId: number | null;
  levelGradeId: number | null;
  levelGradeName: string | null;
  schoolName: string;
};

async function loadPortalChildren(userId: number, role: string): Promise<PortalChildRow[]> {
  if (role === 'parent') {
    const rows = await sql`
      SELECT
        s.id,
        s.school_id  AS "schoolId",
        s.full_name   AS "fullName",
        h.class_id    AS "classId",
        c.name        AS "className",
        h.academic_year_id AS "academicYearId",
        h.level_grade_id AS "levelGradeId",
        lg.name       AS "levelGradeName",
        sc.name       AS "schoolName"
      FROM core_parent_student_relations r
      JOIN core_students s  ON s.id = r.student_id
      JOIN core_schools  sc ON sc.id = s.school_id
      LEFT JOIN LATERAL (
        SELECT ch.class_id, ch.academic_year_id, ch.level_grade_id
        FROM core_student_class_histories ch
        WHERE ch.student_id = s.id AND ch.status = 'active'
        ORDER BY ch.id DESC
        LIMIT 1
      ) h ON true
      LEFT JOIN core_classes c ON c.id = h.class_id
      LEFT JOIN core_level_grades lg ON lg.id = h.level_grade_id
      WHERE r.user_id = ${userId}
        AND s.enrollment_status = 'active'
      ORDER BY s.id ASC
    `;
    return rows as unknown as PortalChildRow[];
  }

  // role = 'student'
  const rows = await sql`
    SELECT
      s.id,
      s.school_id  AS "schoolId",
      s.full_name   AS "fullName",
      h.class_id    AS "classId",
      c.name        AS "className",
      h.academic_year_id AS "academicYearId",
      h.level_grade_id AS "levelGradeId",
      lg.name       AS "levelGradeName",
      sc.name       AS "schoolName"
    FROM core_students s
    JOIN core_schools  sc ON sc.id = s.school_id
    LEFT JOIN LATERAL (
      SELECT ch.class_id, ch.academic_year_id, ch.level_grade_id
      FROM core_student_class_histories ch
      WHERE ch.student_id = s.id AND ch.status = 'active'
      ORDER BY ch.id DESC
      LIMIT 1
    ) h ON true
    LEFT JOIN core_classes c ON c.id = h.class_id
    LEFT JOIN core_level_grades lg ON lg.id = h.level_grade_id
    WHERE s.user_id = ${userId}
      AND s.enrollment_status = 'active'
    ORDER BY s.id ASC
  `;
  return rows as unknown as PortalChildRow[];
}

/** Satu query children per request (dedup layout + halaman). */
export const getPortalChildren = cache(loadPortalChildren);

