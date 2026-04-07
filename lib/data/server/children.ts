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

