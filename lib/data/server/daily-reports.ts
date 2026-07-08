import { sql } from '@/lib/db/client';
import { isStudentVisibleToViewer } from '@/lib/data/server/attendance';
import { isKindergartenStudent } from '@/lib/portal/is-kindergarten';
import type {
  ClassReportInfo,
  ClassReportMedia,
  DailyReportCalendarDay,
  DailyReportFull,
  DailyReportSummaryResponse,
} from '@/lib/portal/daily-reports-shared';
import { monthRange } from '@/lib/data/server/habits';

function normalizeDate(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'string') return value.slice(0, 10);
  return String(value ?? '');
}

function isValidISODate(d: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  return !Number.isNaN(Date.parse(`${d}T12:00:00Z`));
}

async function getStudentLevelInfo(studentId: number): Promise<{
  levelGradeName: string | null;
  levelOrder: number | null;
} | null> {
  const rows = await sql`
    SELECT lg.name AS "levelGradeName", lg.level_order AS "levelOrder"
    FROM core_students s
    LEFT JOIN LATERAL (
      SELECT ch.level_grade_id
      FROM core_student_class_histories ch
      WHERE ch.student_id = s.id AND ch.status = 'active'
      ORDER BY ch.id DESC
      LIMIT 1
    ) h ON true
    LEFT JOIN core_level_grades lg ON lg.id = h.level_grade_id
    WHERE s.id = ${studentId}
    LIMIT 1
  `;
  const r = rows[0] as { levelGradeName?: string | null; levelOrder?: number | null } | undefined;
  if (!r) return null;
  return {
    levelGradeName: r.levelGradeName ?? null,
    levelOrder: r.levelOrder != null ? Number(r.levelOrder) : null,
  };
}

export async function assertKindergartenStudent(
  studentId: number,
): Promise<{ ok: true } | { ok: false; reason: 'not_kg' | 'not_found' }> {
  const info = await getStudentLevelInfo(studentId);
  if (!info) return { ok: false, reason: 'not_found' };
  if (!isKindergartenStudent(info)) return { ok: false, reason: 'not_kg' };
  return { ok: true };
}

async function getTeacherNamesForClass(
  classId: number,
  studentId: number,
): Promise<string[]> {
  const yearRows = await sql`
    SELECT ch.academic_year_id AS "academicYearId"
    FROM core_student_class_histories ch
    WHERE ch.student_id = ${studentId}
      AND ch.class_id = ${classId}
    ORDER BY (ch.status = 'active') DESC, ch.id DESC
    LIMIT 1
  `;
  const academicYearId = (yearRows[0] as { academicYearId?: number } | undefined)?.academicYearId;
  if (academicYearId == null) return [];

  const teacherRows = await sql`
    SELECT DISTINCT u.full_name AS "fullName"
    FROM core_teacher_class_assignments tca
    JOIN core_users u ON u.id = tca.user_id
    WHERE tca.class_id = ${classId}
      AND tca.academic_year_id = ${academicYearId}
    ORDER BY u.full_name ASC
  `;

  return (teacherRows as { fullName: string }[])
    .map((r) => String(r.fullName ?? '').trim())
    .filter(Boolean);
}

export async function getDailyReportCalendarMonth(
  viewerUserId: number,
  viewerRole: string,
  studentId: number,
  year: number,
  monthIndex0: number,
): Promise<DailyReportCalendarDay[] | null> {
  const ok = await isStudentVisibleToViewer(viewerUserId, viewerRole, studentId);
  if (!ok) return null;
  const kg = await assertKindergartenStudent(studentId);
  if (!kg.ok) return null;

  const { from, toExclusive } = monthRange(year, monthIndex0);

  const rows = await sql`
    SELECT
      dr.report_date::text AS "reportDate",
      dr.parent_read_confirmed AS "parentReadConfirmed"
    FROM dr_daily_reports dr
    WHERE dr.student_id = ${studentId}
      AND dr.report_date >= ${from}::date
      AND dr.report_date < ${toExclusive}::date
      AND dr.status IN ('submitted', 'read')
    ORDER BY dr.report_date ASC
  `;

  return (rows as { reportDate: string; parentReadConfirmed: boolean }[]).map((r) => ({
    date: normalizeDate(r.reportDate),
    hasReport: true,
    parentReadConfirmed: Boolean(r.parentReadConfirmed),
  }));
}

export async function getDailyReportByDate(
  viewerUserId: number,
  viewerRole: string,
  studentId: number,
  date: string,
): Promise<
  | { ok: true; report: DailyReportFull }
  | { ok: false; reason: 'forbidden' | 'not_kg' | 'bad_date' | 'not_found' }
> {
  if (!isValidISODate(date)) return { ok: false, reason: 'bad_date' };

  const ok = await isStudentVisibleToViewer(viewerUserId, viewerRole, studentId);
  if (!ok) return { ok: false, reason: 'forbidden' };

  const kg = await assertKindergartenStudent(studentId);
  if (!kg.ok) return { ok: false, reason: 'not_kg' };

  const headerRows = await sql`
    SELECT
      dr.id,
      cs.full_name                AS "studentName",
      cc.name                     AS "className",
      dr.report_date::text        AS "reportDate",
      dr.focus_prayer             AS "focusPrayer",
      dr.focus_prayer_rating      AS "focusPrayerRating",
      dr.dhuha_prayer             AS "dhuhaPrayer",
      dr.zuhur_prayer             AS "zuhurPrayer",
      dr.surah_memorised          AS "surahMemorised",
      dr.asmaul_husna             AS "asmaulHusna",
      dr.play_centre_id           AS "playCentreId",
      pc.name                     AS "playCentre",
      dr.play_centre_highlights   AS "playCentreHighlights",
      dr.lunch_status             AS "lunchStatus",
      dr.water_intake             AS "waterIntake",
      dr.health_note              AS "healthNote",
      dr.mood,
      dr.teacher_highlight        AS "teacherHighlight",
      dr.teacher_followup         AS "teacherFollowup",
      dr.parent_message           AS "parentMessage",
      dr.parent_read_confirmed    AS "parentReadConfirmed",
      dr.parent_read_at           AS "parentReadAt",
      dr.status,
      dr.class_id                 AS "classId"
    FROM dr_daily_reports dr
    JOIN core_students cs ON cs.id = dr.student_id
    JOIN core_classes cc ON cc.id = dr.class_id
    LEFT JOIN dr_play_centres pc ON pc.id = dr.play_centre_id
    WHERE dr.student_id = ${studentId}
      AND dr.report_date = ${date}::date
      AND dr.status IN ('submitted', 'read')
    LIMIT 1
  `;

  const h = headerRows[0] as Record<string, unknown> | undefined;
  if (!h) return { ok: false, reason: 'not_found' };

  const reportId = Number(h.id);
  const playCentreId = h.playCentreId != null ? Number(h.playCentreId) : null;
  const classId = Number(h.classId ?? 0);
  const teacherNames =
    Number.isFinite(classId) && classId > 0
      ? await getTeacherNamesForClass(classId, studentId)
      : [];

  const charRows = await sql`
    SELECT
      mc.name,
      mc.name_id AS "nameId",
      EXISTS (
        SELECT 1 FROM dr_report_characters rc
        WHERE rc.report_id = ${reportId} AND rc.character_id = mc.id
      ) AS selected
    FROM dr_muslim_characters mc
    WHERE mc.is_active = true
    ORDER BY mc.sort_order
  `;

  const playCentreRows = await sql`
    SELECT
      pc.name,
      pc.name_id AS "nameId",
      (pc.id = ${playCentreId}) AS selected
    FROM dr_play_centres pc
    WHERE pc.is_active = true
    ORDER BY pc.sort_order
  `;

  const laRows = await sql`
    SELECT
      la.name,
      la.name_id AS "nameId",
      (rla.id IS NOT NULL) AS selected,
      rla.rating
    FROM dr_learning_areas la
    LEFT JOIN dr_report_learning_areas rla
      ON rla.area_id = la.id AND rla.report_id = ${reportId}
    WHERE la.is_active = true
    ORDER BY la.sort_order
  `;

  const vocabRows = await sql`
    SELECT word, meaning
    FROM dr_report_vocabulary
    WHERE report_id = ${reportId}
    ORDER BY sort_order
  `;

  const classReportRows = await sql`
    SELECT id, theme, teacher_note AS "teacherNote"
    FROM dr_class_reports
    WHERE class_id = ${classId}
      AND report_date = ${date}::date
      AND status = 'submitted'
    LIMIT 1
  `;

  let classReport: ClassReportInfo | null = null;
  const crRow = classReportRows[0] as
    | { id: number; theme: string | null; teacherNote: string | null }
    | undefined;

  if (crRow) {
    const crId = Number(crRow.id);
    const mediaRows = await sql`
      SELECT
        id,
        media_type   AS "mediaType",
        url,
        thumbnail_url AS "thumbnailUrl",
        caption,
        sort_order   AS "sortOrder"
      FROM dr_class_report_media
      WHERE class_report_id = ${crId}
      ORDER BY sort_order, id
    `;

    classReport = {
      id: crId,
      theme: crRow.theme ?? null,
      teacherNote: crRow.teacherNote ?? null,
      media: (
        mediaRows as {
          id: number;
          mediaType: string;
          url: string;
          thumbnailUrl: string | null;
          caption: string | null;
          sortOrder: number;
        }[]
      ).map((m) => ({
        id: Number(m.id),
        mediaType: m.mediaType as ClassReportMedia['mediaType'],
        url: m.url,
        thumbnailUrl: m.thumbnailUrl ?? null,
        caption: m.caption ?? null,
        sortOrder: Number(m.sortOrder),
      })),
    };
  }

  const report: DailyReportFull = {
    id: reportId,
    studentName: String(h.studentName ?? ''),
    className: String(h.className ?? ''),
    reportDate: normalizeDate(h.reportDate),
    focusPrayer: (h.focusPrayer as string | null) ?? null,
    focusPrayerRating:
      h.focusPrayerRating != null ? Number(h.focusPrayerRating) : null,
    dhuhaPrayer: (h.dhuhaPrayer as DailyReportFull['dhuhaPrayer']) ?? null,
    zuhurPrayer: (h.zuhurPrayer as DailyReportFull['zuhurPrayer']) ?? null,
    surahMemorised: (h.surahMemorised as string | null) ?? null,
    asmaulHusna: (h.asmaulHusna as string | null) ?? null,
    playCentre: (h.playCentre as string | null) ?? null,
    playCentreHighlights: (h.playCentreHighlights as string | null) ?? null,
    lunchStatus: (h.lunchStatus as DailyReportFull['lunchStatus']) ?? null,
    waterIntake: (h.waterIntake as DailyReportFull['waterIntake']) ?? null,
    healthNote: (h.healthNote as string | null) ?? null,
    mood: (h.mood as DailyReportFull['mood']) ?? null,
    teacherHighlight: (h.teacherHighlight as string | null) ?? null,
    teacherFollowup: (h.teacherFollowup as string | null) ?? null,
    parentMessage: (h.parentMessage as string | null) ?? null,
    parentReadConfirmed: Boolean(h.parentReadConfirmed),
    parentReadAt: h.parentReadAt != null ? String(h.parentReadAt) : null,
    status: h.status as 'submitted' | 'read',
    teacherNames,
    characters: (charRows as { name: string; nameId: string | null; selected: boolean }[]).map(
      (r) => ({
        name: r.name,
        nameId: r.nameId,
        selected: Boolean(r.selected),
      }),
    ),
    playCentres: (playCentreRows as { name: string; nameId: string | null; selected: boolean }[]).map(
      (r) => ({
        name: r.name,
        nameId: r.nameId,
        selected: Boolean(r.selected),
      }),
    ),
    learningAreas: (
      laRows as { name: string; nameId: string | null; selected: boolean; rating: number | null }[]
    ).map((r) => ({
      name: r.name,
      nameId: r.nameId,
      selected: Boolean(r.selected),
      rating: r.rating != null ? Number(r.rating) : null,
    })),
    vocabulary: vocabRows as DailyReportFull['vocabulary'],
    classReport,
  };

  return { ok: true, report };
}

export type ParentCornerUpdate = {
  parentMessage?: string | null;
  parentReadConfirmed?: boolean;
};

export async function updateDailyReportParentCorner(
  viewerUserId: number,
  viewerRole: string,
  studentId: number,
  date: string,
  input: ParentCornerUpdate,
): Promise<
  | { ok: true; report: DailyReportFull }
  | {
      ok: false;
      reason: 'forbidden' | 'not_kg' | 'bad_date' | 'not_found' | 'future_date';
    }
> {
  if (!isValidISODate(date)) return { ok: false, reason: 'bad_date' };

  const today = new Date().toISOString().slice(0, 10);
  if (date > today) return { ok: false, reason: 'future_date' };

  const ok = await isStudentVisibleToViewer(viewerUserId, viewerRole, studentId);
  if (!ok) return { ok: false, reason: 'forbidden' };

  const kg = await assertKindergartenStudent(studentId);
  if (!kg.ok) return { ok: false, reason: 'not_kg' };

  const existing = await sql`
    SELECT id
    FROM dr_daily_reports
    WHERE student_id = ${studentId}
      AND report_date = ${date}::date
      AND status IN ('submitted', 'read')
    LIMIT 1
  `;

  const row = existing[0] as { id: number } | undefined;
  if (!row) return { ok: false, reason: 'not_found' };

  const message =
    input.parentMessage !== undefined
      ? input.parentMessage?.trim() || null
      : undefined;

  const readConfirmed = input.parentReadConfirmed;

  if (message !== undefined && readConfirmed === true) {
    await sql`
      UPDATE dr_daily_reports
      SET parent_message = ${message},
          parent_read_confirmed = true,
          parent_read_at = now(),
          status = 'read',
          updated_at = now()
      WHERE id = ${row.id}
        AND student_id = ${studentId}
    `;
  } else if (message !== undefined && readConfirmed === false) {
    await sql`
      UPDATE dr_daily_reports
      SET parent_message = ${message},
          parent_read_confirmed = false,
          parent_read_at = NULL,
          status = 'submitted',
          updated_at = now()
      WHERE id = ${row.id}
        AND student_id = ${studentId}
    `;
  } else if (message !== undefined) {
    await sql`
      UPDATE dr_daily_reports
      SET parent_message = ${message},
          updated_at = now()
      WHERE id = ${row.id}
        AND student_id = ${studentId}
    `;
  } else if (readConfirmed === true) {
    await sql`
      UPDATE dr_daily_reports
      SET parent_read_confirmed = true,
          parent_read_at = now(),
          status = 'read',
          updated_at = now()
      WHERE id = ${row.id}
        AND student_id = ${studentId}
    `;
  } else if (readConfirmed === false) {
    await sql`
      UPDATE dr_daily_reports
      SET parent_read_confirmed = false,
          parent_read_at = NULL,
          status = 'submitted',
          updated_at = now()
      WHERE id = ${row.id}
        AND student_id = ${studentId}
    `;
  }

  const result = await getDailyReportByDate(viewerUserId, viewerRole, studentId, date);
  if (!result.ok) return { ok: false, reason: result.reason === 'not_kg' ? 'not_kg' : 'not_found' };
  return { ok: true, report: result.report };
}

export async function getDailyReportSummaryRange(
  viewerUserId: number,
  viewerRole: string,
  studentId: number,
  from: string,
  to: string,
): Promise<DailyReportSummaryResponse | null> {
  if (!isValidISODate(from) || !isValidISODate(to)) return null;

  const ok = await isStudentVisibleToViewer(viewerUserId, viewerRole, studentId);
  if (!ok) return null;

  const kg = await assertKindergartenStudent(studentId);
  if (!kg.ok) return null;

  const countRows = await sql`
    SELECT
      COUNT(*)::int AS "daysReported",
      COUNT(*) FILTER (WHERE dr.parent_read_confirmed = true)::int AS "daysReadByParent"
    FROM dr_daily_reports dr
    WHERE dr.student_id = ${studentId}
      AND dr.report_date >= ${from}::date
      AND dr.report_date <= ${to}::date
      AND dr.status IN ('submitted', 'read')
  `;

  const counts = countRows[0] as { daysReported: number; daysReadByParent: number };
  const daysReported = Number(counts?.daysReported ?? 0);
  const daysReadByParent = Number(counts?.daysReadByParent ?? 0);
  const readRatePct =
    daysReported > 0 ? Math.round((daysReadByParent / daysReported) * 100) : 0;

  const laRows = await sql`
    SELECT
      la.name,
      la.name_id AS "nameId",
      ROUND(AVG(rla.rating), 2)::float AS "avgRating",
      COUNT(*)::int AS "totalObservations"
    FROM dr_report_learning_areas rla
    JOIN dr_learning_areas la ON la.id = rla.area_id
    JOIN dr_daily_reports dr ON dr.id = rla.report_id
    WHERE dr.student_id = ${studentId}
      AND dr.report_date >= ${from}::date
      AND dr.report_date <= ${to}::date
      AND dr.status IN ('submitted', 'read')
    GROUP BY la.id, la.name, la.name_id, la.sort_order
    ORDER BY la.sort_order
  `;

  const moodRows = await sql`
    SELECT dr.mood, COUNT(*)::int AS count
    FROM dr_daily_reports dr
    WHERE dr.student_id = ${studentId}
      AND dr.report_date >= ${from}::date
      AND dr.report_date <= ${to}::date
      AND dr.status IN ('submitted', 'read')
      AND dr.mood IS NOT NULL
    GROUP BY dr.mood
    ORDER BY count DESC
  `;

  return {
    daysReported,
    daysReadByParent,
    readRatePct,
    learningAreas: (laRows as DailyReportSummaryResponse['learningAreas']).map((r) => ({
      name: r.name,
      nameId: r.nameId,
      avgRating: Number(r.avgRating),
      totalObservations: Number(r.totalObservations),
    })),
    moods: (moodRows as DailyReportSummaryResponse['moods']).map((r) => ({
      mood: String(r.mood),
      count: Number(r.count),
    })),
  };
}
