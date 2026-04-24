import { sql } from '@/lib/db/client';

export type AttendanceSummary = {
  present: number;
  sick: number;
  permission: number;
  absent: number;
};

export type PortalAttendanceRow = {
  id: string;
  attendanceDate: string;
  status: string;
  noteEn: string | null;
  noteId: string | null;
};

export type AttendanceHistoryCursor = { attendanceDate: string; id: string };

/** Parent or student may view this student's attendance rows. */
export async function isStudentVisibleToViewer(
  viewerUserId: number,
  viewerRole: string,
  studentId: number,
): Promise<boolean> {
  if (viewerRole === 'parent') {
    const rows = await sql`
      SELECT EXISTS (
        SELECT 1
        FROM core_parent_student_relations r
        JOIN core_students s ON s.id = r.student_id
        WHERE r.user_id = ${viewerUserId}
          AND s.id = ${studentId}
          AND s.enrollment_status = 'active'
      ) AS ok
    `;
    return Boolean((rows[0] as { ok?: boolean })?.ok);
  }
  if (viewerRole === 'student') {
    const rows = await sql`
      SELECT EXISTS (
        SELECT 1
        FROM core_students s
        WHERE s.user_id = ${viewerUserId}
          AND s.id = ${studentId}
          AND s.enrollment_status = 'active'
      ) AS ok
    `;
    return Boolean((rows[0] as { ok?: boolean })?.ok);
  }
  return false;
}

function normalizeDate(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'string') return value.slice(0, 10);
  return String(value ?? '');
}

/** Aggregates for [from, to] inclusive — always filters by date range (partition-friendly). */
export async function getAttendanceSummary(
  viewerUserId: number,
  viewerRole: string,
  studentId: number,
  fromDate: string,
  toDate: string,
): Promise<AttendanceSummary | null> {
  const ok = await isStudentVisibleToViewer(viewerUserId, viewerRole, studentId);
  if (!ok) return null;

  const rows = await sql`
    SELECT
      COUNT(*) FILTER (WHERE LOWER(TRIM(status)) IN ('hadir', 'present'))::int AS present,
      COUNT(*) FILTER (WHERE LOWER(TRIM(status)) = 'sick')::int AS sick,
      COUNT(*) FILTER (WHERE LOWER(TRIM(status)) = 'permission')::int AS permission,
      COUNT(*) FILTER (WHERE LOWER(TRIM(status)) IN ('absent', 'alpa', 'alpha'))::int AS absent
    FROM academic_attendances
    WHERE student_id = ${studentId}
      AND attendance_date >= ${fromDate}::date
      AND attendance_date <= ${toDate}::date
  `;
  const r = rows[0] as Record<string, unknown>;
  return {
    present: Number(r.present ?? 0),
    sick: Number(r.sick ?? 0),
    permission: Number(r.permission ?? 0),
    absent: Number(r.absent ?? 0),
  };
}

function mapAttendanceRow(r: Record<string, unknown>): PortalAttendanceRow {
  return {
    id: String(r.id),
    attendanceDate: normalizeDate(r.attendanceDate),
    status: String(r.status ?? ''),
    noteEn: (r.noteEn as string | null) ?? null,
    noteId: (r.noteId as string | null) ?? null,
  };
}

function pageSlice(
  mapped: PortalAttendanceRow[],
  limit: number,
): { rows: PortalAttendanceRow[]; nextCursor: AttendanceHistoryCursor | null } {
  if (mapped.length > limit) {
    const page = mapped.slice(0, limit);
    const last = page[limit - 1];
    return {
      rows: page,
      nextCursor: last ? { attendanceDate: last.attendanceDate, id: last.id } : null,
    };
  }
  return { rows: mapped, nextCursor: null };
}

export async function getAttendanceHistoryPage(
  viewerUserId: number,
  viewerRole: string,
  studentId: number,
  opts: {
    fromDate: string;
    toDate: string;
    status: string | null;
    limit: number;
    cursor: AttendanceHistoryCursor | null;
  },
): Promise<{ rows: PortalAttendanceRow[]; nextCursor: AttendanceHistoryCursor | null } | null> {
  const ok = await isStudentVisibleToViewer(viewerUserId, viewerRole, studentId);
  if (!ok) return null;

  const limit = Math.min(Math.max(opts.limit, 1), 50);
  const fetchLimit = limit + 1;
  const fromDate = opts.fromDate;
  const toDate = opts.toDate;
  const statusFilter = opts.status?.trim().toLowerCase();
  const allStatuses = !statusFilter || statusFilter === 'all';
  const cursor = opts.cursor;

  if (!allStatuses && statusFilter) {
    if (cursor) {
      const idNum = Number(cursor.id);
      const rows = await sql`
        SELECT
          a.id::text           AS "id",
          a.attendance_date    AS "attendanceDate",
          a.status             AS "status",
          a.note_en            AS "noteEn",
          a.note_id            AS "noteId"
        FROM academic_attendances a
        WHERE a.student_id = ${studentId}
          AND a.attendance_date >= ${fromDate}::date
          AND a.attendance_date <= ${toDate}::date
          AND LOWER(TRIM(a.status)) = ${statusFilter}
          AND (
            a.attendance_date < ${cursor.attendanceDate}::date
            OR (a.attendance_date = ${cursor.attendanceDate}::date AND a.id < ${idNum})
          )
        ORDER BY a.attendance_date DESC, a.id DESC
        LIMIT ${fetchLimit}
      `;
      return pageSlice((rows as Record<string, unknown>[]).map(mapAttendanceRow), limit);
    }
    const rows = await sql`
      SELECT
        a.id::text           AS "id",
        a.attendance_date    AS "attendanceDate",
        a.status             AS "status",
        a.note_en            AS "noteEn",
        a.note_id            AS "noteId"
      FROM academic_attendances a
      WHERE a.student_id = ${studentId}
        AND a.attendance_date >= ${fromDate}::date
        AND a.attendance_date <= ${toDate}::date
        AND LOWER(TRIM(a.status)) = ${statusFilter}
      ORDER BY a.attendance_date DESC, a.id DESC
      LIMIT ${fetchLimit}
    `;
    return pageSlice((rows as Record<string, unknown>[]).map(mapAttendanceRow), limit);
  }

  if (cursor) {
    const idNum = Number(cursor.id);
    const rows = await sql`
      SELECT
        a.id::text           AS "id",
        a.attendance_date    AS "attendanceDate",
        a.status             AS "status",
        a.note_en            AS "noteEn",
        a.note_id            AS "noteId"
      FROM academic_attendances a
      WHERE a.student_id = ${studentId}
        AND a.attendance_date >= ${fromDate}::date
        AND a.attendance_date <= ${toDate}::date
        AND (
          a.attendance_date < ${cursor.attendanceDate}::date
          OR (a.attendance_date = ${cursor.attendanceDate}::date AND a.id < ${idNum})
        )
      ORDER BY a.attendance_date DESC, a.id DESC
      LIMIT ${fetchLimit}
    `;
    return pageSlice((rows as Record<string, unknown>[]).map(mapAttendanceRow), limit);
  }

  const rows = await sql`
    SELECT
      a.id::text           AS "id",
      a.attendance_date    AS "attendanceDate",
      a.status             AS "status",
      a.note_en            AS "noteEn",
      a.note_id            AS "noteId"
    FROM academic_attendances a
    WHERE a.student_id = ${studentId}
      AND a.attendance_date >= ${fromDate}::date
      AND a.attendance_date <= ${toDate}::date
    ORDER BY a.attendance_date DESC, a.id DESC
    LIMIT ${fetchLimit}
  `;
  return pageSlice((rows as Record<string, unknown>[]).map(mapAttendanceRow), limit);
}

export type InsertAttendanceInput = {
  studentId: number;
  attendanceDate: string;
  status: 'sick' | 'permission';
  noteEn: string;
  noteId: string;
};

export type InsertAttendanceResult =
  | { ok: true; row: PortalAttendanceRow }
  | { ok: false; reason: 'forbidden' | 'duplicate' | 'invalid_status' };

export async function insertAttendanceEntry(
  viewerUserId: number,
  viewerRole: string,
  input: InsertAttendanceInput,
): Promise<InsertAttendanceResult> {
  if (input.status !== 'sick' && input.status !== 'permission') {
    return { ok: false, reason: 'invalid_status' };
  }

  const ok = await isStudentVisibleToViewer(viewerUserId, viewerRole, input.studentId);
  if (!ok) return { ok: false, reason: 'forbidden' };

  const dup = await sql`
    SELECT 1
    FROM academic_attendances a
    WHERE a.student_id = ${input.studentId}
      AND a.attendance_date = ${input.attendanceDate}::date
    LIMIT 1
  `;
  if (dup.length > 0) return { ok: false, reason: 'duplicate' };

  const ne = input.noteEn.trim() || null;
  const ni = input.noteId.trim() || null;

  const rows = await sql`
    INSERT INTO academic_attendances (student_id, attendance_date, status, note_en, note_id)
    VALUES (
      ${input.studentId},
      ${input.attendanceDate}::date,
      ${input.status},
      ${ne},
      ${ni}
    )
    RETURNING
      id::text AS "id",
      attendance_date AS "attendanceDate",
      status AS "status",
      note_en AS "noteEn",
      note_id AS "noteId"
  `;

  const row = mapAttendanceRow(rows[0] as Record<string, unknown>);
  return { ok: true, row };
}
