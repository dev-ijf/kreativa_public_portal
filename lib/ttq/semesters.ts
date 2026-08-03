import { sql } from '@/lib/db/client';

export type CoreSemester = {
  id: number;
  academic_year_id: number;
  semester_number: 1 | 2;
  name: string;
  start_date: string | null;
  end_date: string | null;
};

export function semesterNumberFromDate(iso: string): 1 | 2 {
  const month = Number(iso.slice(5, 7));
  if (!Number.isFinite(month) || month < 1) return 1;
  return month >= 7 ? 1 : 2;
}

function normalizeDate(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

export async function listSemestersForYear(
  academicYearId: number
): Promise<CoreSemester[]> {
  const rows = await sql`
    SELECT id, academic_year_id, semester_number, name, start_date, end_date
    FROM core_semesters
    WHERE academic_year_id = ${academicYearId}
    ORDER BY semester_number
  `;
  return rows.map((r) => ({
    id: Number(r.id),
    academic_year_id: Number(r.academic_year_id),
    semester_number: Number(r.semester_number) === 2 ? 2 : 1,
    name: String(r.name),
    start_date: normalizeDate(r.start_date),
    end_date: normalizeDate(r.end_date),
  }));
}

export async function resolveSemesterId(
  academicYearId: number,
  dateIso: string
): Promise<number | null> {
  const semesters = await listSemestersForYear(academicYearId);
  if (!semesters.length) return null;
  const byRange = semesters.find((s) => {
    if (!s.start_date || !s.end_date) return false;
    return dateIso >= s.start_date && dateIso <= s.end_date;
  });
  if (byRange) return byRange.id;
  const n = semesterNumberFromDate(dateIso);
  return semesters.find((s) => s.semester_number === n)?.id ?? null;
}

export type TtqTargetRow = {
  jilid_id: number;
  halaman: number;
  jilid_name: string;
  surah_id: number;
  surah_nomor: number;
  surah_name: string;
  semester_id: number | null;
};

export async function loadTtqClassTarget(opts: {
  classId: number;
  academicYearId: number;
  semesterId?: number | null;
}): Promise<TtqTargetRow | null> {
  const semesterId = opts.semesterId ?? null;
  const rows =
    semesterId == null
      ? await sql`
          SELECT
            tct.semester_id, tct.target_jilid_id, tct.target_halaman, tct.target_surah_id,
            tj.name AS target_jilid_name,
            ts.nomor AS target_surah_nomor, ts.name_latin AS target_surah_name
          FROM ttq_class_targets tct
          JOIN ttq_jilid tj ON tj.id = tct.target_jilid_id
          JOIN ttq_surah ts ON ts.id = tct.target_surah_id
          WHERE tct.class_id = ${opts.classId}
            AND tct.academic_year_id = ${opts.academicYearId}
            AND tct.semester_id IS NULL
          LIMIT 1
        `
      : await sql`
          SELECT
            tct.semester_id, tct.target_jilid_id, tct.target_halaman, tct.target_surah_id,
            tj.name AS target_jilid_name,
            ts.nomor AS target_surah_nomor, ts.name_latin AS target_surah_name
          FROM ttq_class_targets tct
          JOIN ttq_jilid tj ON tj.id = tct.target_jilid_id
          JOIN ttq_surah ts ON ts.id = tct.target_surah_id
          WHERE tct.class_id = ${opts.classId}
            AND tct.academic_year_id = ${opts.academicYearId}
            AND tct.semester_id = ${semesterId}
          LIMIT 1
        `;
  if (!rows[0]) return null;
  return {
    semester_id: rows[0].semester_id == null ? null : Number(rows[0].semester_id),
    jilid_id: Number(rows[0].target_jilid_id),
    halaman: Number(rows[0].target_halaman),
    jilid_name: String(rows[0].target_jilid_name),
    surah_id: Number(rows[0].target_surah_id),
    surah_nomor: Number(rows[0].target_surah_nomor),
    surah_name: String(rows[0].target_surah_name),
  };
}

export async function loadTtqClassTargetForDate(opts: {
  classId: number;
  academicYearId: number;
  dateIso: string;
}): Promise<TtqTargetRow | null> {
  const semesterId = await resolveSemesterId(opts.academicYearId, opts.dateIso);
  if (semesterId != null) {
    const smt = await loadTtqClassTarget({
      classId: opts.classId,
      academicYearId: opts.academicYearId,
      semesterId,
    });
    if (smt) return smt;
  }
  return loadTtqClassTarget({
    classId: opts.classId,
    academicYearId: opts.academicYearId,
    semesterId: null,
  });
}
