import { sql } from '@/lib/db/client';
import { isStudentVisibleToViewer } from '@/lib/data/server/attendance';
import {
  avgPct,
  isTahfidzAchieved,
  isTilawahAchieved,
  tahfidzPct,
  tilawahPct,
} from '@/lib/ttq/formulas';
import {
  listSemestersForYear,
  loadTtqClassTarget,
  loadTtqClassTargetForDate,
  semesterNumberFromDate,
} from '@/lib/ttq/semesters';

function normalizeDate(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'string') return value.slice(0, 10);
  return String(value ?? '');
}

async function getActiveAcademicYearId(): Promise<number | null> {
  const rows = await sql`
    SELECT id FROM core_academic_years WHERE is_active = true ORDER BY id DESC LIMIT 1
  `;
  return rows[0] ? Number(rows[0].id) : null;
}

function mapTarget(t: Awaited<ReturnType<typeof loadTtqClassTarget>>) {
  if (!t) return null;
  return {
    jilid_id: t.jilid_id,
    halaman: t.halaman,
    jilid_name: t.jilid_name,
    surah_id: t.surah_id,
    surah_nomor: t.surah_nomor,
    surah_name: t.surah_name,
    semester_id: t.semester_id,
  };
}

export async function getTtqSummary(
  viewerUserId: number,
  viewerRole: string,
  studentId: number
) {
  const ok = await isStudentVisibleToViewer(viewerUserId, viewerRole, studentId);
  if (!ok) return null;

  const ayId = await getActiveAcademicYearId();
  if (!ayId) return null;

  const studentRows = await sql`
    SELECT
      s.id, s.full_name, s.nis, s.school_id,
      sch.name AS school_name,
      c.id AS class_id, c.name AS class_name,
      lg.name AS grade_name
    FROM core_students s
    JOIN core_schools sch ON sch.id = s.school_id
    LEFT JOIN core_student_class_histories h
      ON h.student_id = s.id AND h.status = 'active' AND h.academic_year_id = ${ayId}
    LEFT JOIN core_classes c ON c.id = h.class_id
    LEFT JOIN core_level_grades lg ON lg.id = c.level_grade_id
    WHERE s.id = ${studentId}
    LIMIT 1
  `;
  if (!studentRows[0]) return null;
  const st = studentRows[0];
  const classId = st.class_id == null ? null : Number(st.class_id);

  const today = new Date().toISOString().slice(0, 10);
  const [semesters, semesterTarget, yearTarget, latestRows, achievedCountRows] =
    await Promise.all([
      listSemestersForYear(ayId),
      classId
        ? loadTtqClassTargetForDate({
            classId,
            academicYearId: ayId,
            dateIso: today,
          })
        : Promise.resolve(null),
      classId
        ? loadTtqClassTarget({
            classId,
            academicYearId: ayId,
            semesterId: null,
          })
        : Promise.resolve(null),
      sql`
        SELECT
          dl.log_date, dl.is_absent, dl.jilid_id, dl.halaman, dl.current_surah_id,
          dl.is_tilawah_achieved, dl.is_tahfidz_achieved, dl.catatan, dl.updated_at,
          j.name AS jilid_name,
          su.nomor AS surah_nomor, su.name_latin AS surah_name
        FROM ttq_daily_logs dl
        LEFT JOIN ttq_jilid j ON j.id = dl.jilid_id
        LEFT JOIN ttq_surah su ON su.id = dl.current_surah_id
        WHERE dl.student_id = ${studentId}
          AND dl.academic_year_id = ${ayId}
        ORDER BY dl.log_date DESC
        LIMIT 1
      `,
      sql`
        SELECT COUNT(*)::int AS cnt
        FROM ttq_surah_achieved
        WHERE student_id = ${studentId}
      `,
    ]);

  const target = mapTarget(semesterTarget);
  const target_year = mapTarget(yearTarget);
  const currentSemesterNumber = semesterNumberFromDate(today);
  const currentSemester =
    semesters.find((s) => s.semester_number === currentSemesterNumber) || null;

  const latest = latestRows[0]
    ? {
        log_date: normalizeDate(latestRows[0].log_date),
        is_absent: Boolean(latestRows[0].is_absent),
        jilid_id: latestRows[0].jilid_id == null ? null : Number(latestRows[0].jilid_id),
        jilid_name: latestRows[0].jilid_name == null ? null : String(latestRows[0].jilid_name),
        halaman: latestRows[0].halaman == null ? null : Number(latestRows[0].halaman),
        surah_nomor: latestRows[0].surah_nomor == null ? null : Number(latestRows[0].surah_nomor),
        surah_name: latestRows[0].surah_name == null ? null : String(latestRows[0].surah_name),
        updated_at: latestRows[0].updated_at == null ? null : String(latestRows[0].updated_at),
      }
    : null;

  // Progress % vs current semester target (fallback year)
  const pctTarget = target || target_year;
  let tilawah_pct = 0;
  let tahfidz_pct = 0;
  let tilawah_ok = false;
  let tahfidz_ok = false;
  if (
    latest &&
    !latest.is_absent &&
    pctTarget &&
    latest.jilid_id != null &&
    latest.halaman != null
  ) {
    tilawah_pct = tilawahPct(
      latest.jilid_id,
      latest.halaman,
      pctTarget.jilid_id,
      pctTarget.halaman
    );
    tilawah_ok = isTilawahAchieved(
      latest.jilid_id,
      latest.halaman,
      pctTarget.jilid_id,
      pctTarget.halaman
    );
  }
  if (latest && !latest.is_absent && pctTarget && latest.surah_nomor != null) {
    tahfidz_pct = tahfidzPct(latest.surah_nomor, pctTarget.surah_nomor);
    tahfidz_ok = isTahfidzAchieved(latest.surah_nomor, pctTarget.surah_nomor);
  }

  return {
    academic_year_id: ayId,
    student: {
      id: Number(st.id),
      full_name: String(st.full_name),
      nis: String(st.nis ?? ''),
      school_name: String(st.school_name),
      class_name: st.class_name == null ? null : String(st.class_name),
      grade_name: st.grade_name == null ? null : String(st.grade_name),
    },
    target,
    target_year,
    current_semester: currentSemester
      ? {
          id: currentSemester.id,
          semester_number: currentSemester.semester_number,
          name: currentSemester.name,
        }
      : null,
    latest,
    tilawah_pct,
    tahfidz_pct,
    avg_pct: avgPct(tilawah_pct, tahfidz_pct),
    tilawah_ok,
    tahfidz_ok,
    achieved_count: Number(achievedCountRows[0]?.cnt ?? 0),
  };
}

export async function getTtqHistory(
  viewerUserId: number,
  viewerRole: string,
  studentId: number,
  opts: { limit?: number; offset?: number } = {}
) {
  const ok = await isStudentVisibleToViewer(viewerUserId, viewerRole, studentId);
  if (!ok) return null;

  const ayId = await getActiveAcademicYearId();
  if (!ayId) return null;

  const limit = Math.min(Math.max(opts.limit ?? 10, 1), 50);
  const offset = Math.max(opts.offset ?? 0, 0);
  const fetchLimit = limit + 1;

  const rows = await sql`
    SELECT
      dl.log_date, dl.is_absent, dl.jilid_id, dl.halaman, dl.catatan,
      dl.is_tilawah_achieved, dl.is_tahfidz_achieved,
      j.name AS jilid_name,
      su.nomor AS surah_nomor, su.name_latin AS surah_name,
      tct.target_jilid_id, tct.target_halaman,
      tsu.nomor AS target_surah_nomor
    FROM ttq_daily_logs dl
    LEFT JOIN ttq_jilid j ON j.id = dl.jilid_id
    LEFT JOIN ttq_surah su ON su.id = dl.current_surah_id
    LEFT JOIN core_semesters cs
      ON cs.academic_year_id = dl.academic_year_id
     AND cs.semester_number = CASE
           WHEN EXTRACT(MONTH FROM dl.log_date) >= 7 THEN 1
           ELSE 2
         END
    LEFT JOIN ttq_class_targets tct
      ON tct.class_id = dl.class_id
     AND tct.academic_year_id = dl.academic_year_id
     AND tct.semester_id = cs.id
    LEFT JOIN ttq_surah tsu ON tsu.id = tct.target_surah_id
    WHERE dl.student_id = ${studentId}
      AND dl.academic_year_id = ${ayId}
    ORDER BY dl.log_date DESC
    LIMIT ${fetchLimit} OFFSET ${offset}
  `;

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;

  const achievedOnDates = await sql`
    SELECT sa.achieved_date, su.nomor, su.name_latin, su.ayah_count
    FROM ttq_surah_achieved sa
    JOIN ttq_surah su ON su.id = sa.surah_id
    WHERE sa.student_id = ${studentId}
  `;
  const achievedByDate = new Map<string, typeof achievedOnDates>();
  for (const a of achievedOnDates) {
    const d = normalizeDate(a.achieved_date);
    const list = achievedByDate.get(d) || [];
    list.push(a);
    achievedByDate.set(d, list);
  }

  const items = pageRows.map((r) => {
    const isAbsent = Boolean(r.is_absent);
    const jilid = r.jilid_id == null ? null : Number(r.jilid_id);
    const halaman = r.halaman == null ? null : Number(r.halaman);
    const surahNo = r.surah_nomor == null ? null : Number(r.surah_nomor);
    const tJilid = r.target_jilid_id == null ? null : Number(r.target_jilid_id);
    const tHal = r.target_halaman == null ? null : Number(r.target_halaman);
    const tSurah = r.target_surah_nomor == null ? null : Number(r.target_surah_nomor);
    const logDate = normalizeDate(r.log_date);

    const tPct =
      !isAbsent && jilid != null && halaman != null && tJilid != null && tHal != null
        ? tilawahPct(jilid, halaman, tJilid, tHal)
        : 0;
    const hPct =
      !isAbsent && surahNo != null && tSurah != null ? tahfidzPct(surahNo, tSurah) : 0;

    return {
      log_date: logDate,
      is_absent: isAbsent,
      jilid_name: r.jilid_name == null ? null : String(r.jilid_name),
      halaman,
      surah_nomor: surahNo,
      surah_name: r.surah_name == null ? null : String(r.surah_name),
      catatan: r.catatan == null ? null : String(r.catatan),
      tilawah_pct: tPct,
      tahfidz_pct: hPct,
      tilawah_ok: Boolean(r.is_tilawah_achieved),
      tahfidz_ok: Boolean(r.is_tahfidz_achieved),
      achieved_today: (achievedByDate.get(logDate) || []).map((a) => ({
        nomor: Number(a.nomor),
        name_latin: String(a.name_latin),
        ayah_count: Number(a.ayah_count),
      })),
    };
  });

  return { items, hasMore };
}

export async function getTtqAchieved(
  viewerUserId: number,
  viewerRole: string,
  studentId: number
) {
  const ok = await isStudentVisibleToViewer(viewerUserId, viewerRole, studentId);
  if (!ok) return null;

  const rows = await sql`
    SELECT
      su.nomor, su.name_latin AS surah_name, su.ayah_count,
      sa.achieved_date, u.full_name AS verified_by
    FROM ttq_surah_achieved sa
    JOIN ttq_surah su ON su.id = sa.surah_id
    LEFT JOIN core_users u ON u.id = sa.verified_by
    WHERE sa.student_id = ${studentId}
    ORDER BY sa.achieved_date DESC, su.nomor DESC
  `;

  return rows.map((r) => ({
    nomor: Number(r.nomor),
    surah_name: String(r.surah_name),
    ayah_count: Number(r.ayah_count),
    achieved_date: normalizeDate(r.achieved_date),
    verified_by: r.verified_by == null ? null : String(r.verified_by),
  }));
}

export async function getTtqRekap(
  viewerUserId: number,
  viewerRole: string,
  studentId: number,
  opts: { mode: 'month' | 'year'; month?: string | null }
) {
  const summary = await getTtqSummary(viewerUserId, viewerRole, studentId);
  if (!summary) return null;

  let monthStart: string | null = null;
  let monthEnd: string | null = null;
  if (opts.mode === 'month') {
    const ym = opts.month || new Date().toISOString().slice(0, 7);
    const m = ym.match(/^(\d{4})-(\d{2})$/);
    if (!m) return null;
    const y = Number(m[1]);
    const mo = Number(m[2]);
    monthStart = `${y}-${String(mo).padStart(2, '0')}-01`;
    const last = new Date(y, mo, 0).getDate();
    monthEnd = `${y}-${String(mo).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
  }

  const history = await sql`
    SELECT
      dl.log_date, dl.is_absent, dl.jilid_id, dl.halaman,
      j.name AS jilid_name,
      su.nomor AS surah_nomor, su.name_latin AS surah_name
    FROM ttq_daily_logs dl
    LEFT JOIN ttq_jilid j ON j.id = dl.jilid_id
    LEFT JOIN ttq_surah su ON su.id = dl.current_surah_id
    WHERE dl.student_id = ${studentId}
      AND dl.academic_year_id = ${summary.academic_year_id}
      AND (${monthStart}::date IS NULL OR dl.log_date >= ${monthStart}::date)
      AND (${monthEnd}::date IS NULL OR dl.log_date <= ${monthEnd}::date)
    ORDER BY dl.log_date ASC
  `;

  const present = history.filter((h) => !h.is_absent);
  const absent = history.filter((h) => h.is_absent).length;
  const chart = present.map((h) => ({
    date: normalizeDate(h.log_date),
    halaman: h.halaman == null ? 0 : Number(h.halaman),
    jilid_id: h.jilid_id == null ? null : Number(h.jilid_id),
    label: `${h.jilid_name || ''} Hal.${h.halaman ?? '—'}`.trim(),
  }));

  const achieved = await getTtqAchieved(viewerUserId, viewerRole, studentId);

  return {
    ...summary,
    mode: opts.mode,
    month_start: monthStart,
    month_end: monthEnd,
    hadir: present.length,
    absen: absent,
    attendance_pct:
      history.length === 0 ? 0 : Math.round((present.length / history.length) * 100),
    chart,
    achieved: achieved || [],
  };
}
