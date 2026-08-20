import { sql } from '@/lib/db/client';
import {
  cacheDelByPattern,
  cacheGetJson,
  cacheSetJsonTtl,
} from '@/lib/cache/upstash-redis';
import { isStudentVisibleToViewer } from '@/lib/data/server/attendance';
import {
  isDailyReportStudent,
  isKindergartenStudent,
  isPrimaryStudent,
} from '@/lib/portal/is-kindergarten';
import type {
  ClassReportInfo,
  ClassReportMedia,
  DailyReportCalendarDay,
  DailyReportCalendarMonthResponse,
  DailyReportFull,
  DailyReportHomeTip,
  DailyReportMemorize,
  DailyReportObserveDomain,
  DailyReportMessage,
  DailyReportParentPatch,
  DailyReportSchoolLevel,
  DailyReportStudentMedia,
  DailyReportHomeworkItem,
  DailyReportSubject,
  DailyReportSubjectHistoryItem,
  DailyReportSubjectOption,
  DailyReportSummaryResponse,
  DailyReportTilawah,
} from '@/lib/portal/daily-reports-shared';
import { monthRange } from '@/lib/data/server/habits';

/** Calendar cache: ERP invalidates `dr:cal:{studentId}:*` on submit; short TTL as fallback. */
const DR_CALENDAR_TTL_SEC = 30;

function calendarCacheKey(studentId: number, year: number, monthIndex0: number): string {
  return `dr:cal:${studentId}:${year}:${monthIndex0}`;
}

async function invalidateDailyReportCalendarCache(studentId: number): Promise<void> {
  await cacheDelByPattern(`dr:cal:${studentId}:*`);
}

type UnsupportedReason = 'unsupported_level' | 'not_found';

function normalizeDate(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'string') return value.slice(0, 10);
  return String(value ?? '');
}

function isValidISODate(d: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  return !Number.isNaN(Date.parse(`${d}T12:00:00Z`));
}

function normalizeSchoolLevel(raw: unknown): DailyReportSchoolLevel {
  return raw === 'primary' ? 'primary' : 'kindergarten';
}

async function getStudentLevelInfo(studentId: number): Promise<{
  levelGradeName: string | null;
  levelOrder: number | null;
  schoolName: string | null;
  className: string | null;
  classId: number | null;
  schoolId: number | null;
  studentName: string;
} | null> {
  const rows = await sql`
    SELECT
      lg.name AS "levelGradeName",
      lg.level_order AS "levelOrder",
      sc.name AS "schoolName",
      cc.name AS "className",
      cc.id AS "classId",
      s.school_id AS "schoolId",
      s.full_name AS "studentName"
    FROM core_students s
    LEFT JOIN core_schools sc ON sc.id = s.school_id
    LEFT JOIN LATERAL (
      SELECT ch.level_grade_id, ch.class_id
      FROM core_student_class_histories ch
      WHERE ch.student_id = s.id AND ch.status = 'active'
      ORDER BY ch.id DESC
      LIMIT 1
    ) h ON true
    LEFT JOIN core_level_grades lg ON lg.id = h.level_grade_id
    LEFT JOIN core_classes cc ON cc.id = h.class_id
    WHERE s.id = ${studentId}
    LIMIT 1
  `;
  const r = rows[0] as {
    levelGradeName?: string | null;
    levelOrder?: number | null;
    schoolName?: string | null;
    className?: string | null;
    classId?: number | null;
    schoolId?: number | null;
    studentName?: string | null;
  } | undefined;
  if (!r) return null;
  return {
    levelGradeName: r.levelGradeName ?? null,
    levelOrder: r.levelOrder != null ? Number(r.levelOrder) : null,
    schoolName: r.schoolName ?? null,
    className: r.className ?? null,
    classId: r.classId != null ? Number(r.classId) : null,
    schoolId: r.schoolId != null ? Number(r.schoolId) : null,
    studentName: String(r.studentName ?? ''),
  };
}

/** Allow KG + Primary students for parent Daily Reports. */
export async function assertDailyReportStudent(
  studentId: number,
): Promise<{ ok: true; info: NonNullable<Awaited<ReturnType<typeof getStudentLevelInfo>>> } | { ok: false; reason: UnsupportedReason }> {
  const info = await getStudentLevelInfo(studentId);
  if (!info) return { ok: false, reason: 'not_found' };
  if (!isDailyReportStudent(info)) return { ok: false, reason: 'unsupported_level' };
  return { ok: true, info };
}

/** Visibility + level gate in one parallel round-trip pair. */
export async function assertDailyReportAccess(
  viewerUserId: number,
  viewerRole: string,
  studentId: number,
): Promise<
  | { ok: true; info: NonNullable<Awaited<ReturnType<typeof getStudentLevelInfo>>> }
  | { ok: false; reason: 'forbidden' | UnsupportedReason }
> {
  const [visible, level] = await Promise.all([
    isStudentVisibleToViewer(viewerUserId, viewerRole, studentId),
    assertDailyReportStudent(studentId),
  ]);
  if (!visible) return { ok: false, reason: 'forbidden' };
  if (!level.ok) return { ok: false, reason: level.reason };
  return { ok: true, info: level.info };
}

/** @deprecated Prefer assertDailyReportStudent — kept for any leftover KG-only call sites. */
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

async function loadSubmittedClassReport(
  classId: number,
  date: string,
): Promise<ClassReportInfo | null> {
  if (!Number.isFinite(classId) || classId <= 0) return null;
  const rows = await sql`
    SELECT id, theme, teacher_note AS "teacherNote"
    FROM dr_class_reports
    WHERE class_id = ${classId}
      AND report_date = ${date}::date
      AND status = 'submitted'
    LIMIT 1
  `;
  const row = rows[0] as
    | { id: number; theme: string | null; teacherNote: string | null }
    | undefined;
  if (!row) return null;

  const id = Number(row.id);
  const mediaRows = await sql`
    SELECT
      id,
      media_type    AS "mediaType",
      url,
      thumbnail_url AS "thumbnailUrl",
      caption,
      sort_order    AS "sortOrder"
    FROM dr_class_report_media
    WHERE class_report_id = ${id}
    ORDER BY sort_order, id
  `;

  return {
    id,
    theme: row.theme ?? null,
    teacherNote: row.teacherNote ?? null,
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

/**
 * Synthesise a read-only report carrying just the class report, for dates where
 * the teacher filled the class report but no per-student report exists.
 */
async function buildClassReportOnlyReport(
  info: NonNullable<Awaited<ReturnType<typeof getStudentLevelInfo>>>,
  studentId: number,
  date: string,
): Promise<DailyReportFull | null> {
  const classId = info.classId ?? 0;
  const classReport = await loadSubmittedClassReport(classId, date);
  if (!classReport) return null;

  const teacherNames = await getTeacherNamesForClass(classId, studentId).catch(
    () => [] as string[],
  );

  return {
    id: 0,
    studentName: info.studentName,
    className: info.className ?? '',
    reportDate: date,
    schoolLevel: isPrimaryStudent(info) ? 'primary' : 'kindergarten',
    focusPrayer: null,
    focusPrayerRating: null,
    dhuhaPrayer: null,
    zuhurPrayer: null,
    surahMemorised: null,
    asmaulHusna: null,
    playCentre: null,
    playCentreHighlights: null,
    lunchStatus: null,
    waterIntake: null,
    healthNote: null,
    mood: null,
    sleepTime: null,
    wakeTime: null,
    readingTogether: false,
    shineMoment: null,
    teacherNarrative: null,
    homeGuidance: null,
    teacherHighlight: null,
    teacherFollowup: null,
    parentMessage: null,
    messages: [],
    parentReadConfirmed: false,
    parentReadAt: null,
    status: 'submitted',
    teacherNames,
    characters: [],
    playCentres: [],
    learningAreas: [],
    vocabulary: [],
    subjects: [],
    observeDomains: [],
    homeTips: [],
    studentMedia: [],
    classReport,
    tilawah: null,
    memorize: [],
    classReportOnly: true,
  };
}

/** School calendar date YYYY-MM-DD in WIB — the server may run on UTC. */
function todayWibDate(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function suggestedDateFromCalendarDays(days: DailyReportCalendarDay[]): string {
  const today = todayWibDate();
  if (days.some((d) => d.date === today)) return today;
  const latest = [...days].sort((a, b) => b.date.localeCompare(a.date))[0];
  return latest?.date ?? today;
}

export async function getDailyReportCalendarMonth(
  viewerUserId: number,
  viewerRole: string,
  studentId: number,
  year: number,
  monthIndex0: number,
): Promise<DailyReportCalendarMonthResponse | null> {
  const access = await assertDailyReportAccess(viewerUserId, viewerRole, studentId);
  if (!access.ok) return null;

  const cacheKey = calendarCacheKey(studentId, year, monthIndex0);
  const cached = await cacheGetJson<DailyReportCalendarMonthResponse>(cacheKey);
  if (cached?.days) return cached;

  const { from, toExclusive } = monthRange(year, monthIndex0);

  const classId = access.info.classId ?? 0;

  const [rows, classRows] = await Promise.all([
    sql`
      SELECT
        dr.report_date::text AS "reportDate",
        dr.parent_read_confirmed AS "parentReadConfirmed"
      FROM dr_daily_reports dr
      WHERE dr.student_id = ${studentId}
        AND dr.report_date >= ${from}::date
        AND dr.report_date < ${toExclusive}::date
        AND dr.status IN ('submitted', 'read')
      ORDER BY dr.report_date ASC
    `,
    // A submitted class report is published to every student in the class,
    // even on days without a per-student report row.
    classId > 0
      ? sql`
          SELECT cr.report_date::text AS "reportDate"
          FROM dr_class_reports cr
          WHERE cr.class_id = ${classId}
            AND cr.report_date >= ${from}::date
            AND cr.report_date < ${toExclusive}::date
            AND cr.status = 'submitted'
        `
      : Promise.resolve([]),
  ]);

  const dayMap = new Map<string, DailyReportCalendarDay>();
  for (const r of rows as { reportDate: string; parentReadConfirmed: boolean }[]) {
    const date = normalizeDate(r.reportDate);
    dayMap.set(date, {
      date,
      hasReport: true,
      parentReadConfirmed: Boolean(r.parentReadConfirmed),
    });
  }
  for (const r of classRows as { reportDate: string }[]) {
    const date = normalizeDate(r.reportDate);
    if (!dayMap.has(date)) {
      dayMap.set(date, { date, hasReport: true, parentReadConfirmed: false });
    }
  }
  const days = Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  const result: DailyReportCalendarMonthResponse = {
    days,
    suggestedDate: suggestedDateFromCalendarDays(days),
  };
  void cacheSetJsonTtl(cacheKey, result, DR_CALENDAR_TTL_SEC);
  return result;
}

function toStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  if (typeof v === 'string') {
    return v
      .replace(/[{}]/g, '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

export async function getDailyReportByDate(
  viewerUserId: number,
  viewerRole: string,
  studentId: number,
  date: string,
): Promise<
  | { ok: true; report: DailyReportFull }
  | { ok: false; reason: 'forbidden' | 'unsupported_level' | 'bad_date' | 'not_found' }
> {
  if (!isValidISODate(date)) return { ok: false, reason: 'bad_date' };

  const access = await assertDailyReportAccess(viewerUserId, viewerRole, studentId);
  if (!access.ok) {
    return {
      ok: false,
      reason:
        access.reason === 'forbidden'
          ? 'forbidden'
          : access.reason === 'not_found'
            ? 'not_found'
            : 'unsupported_level',
    };
  }

  const headerRows = await sql`
    SELECT
      dr.id,
      cs.full_name                AS "studentName",
      cc.name                     AS "className",
      dr.report_date::text        AS "reportDate",
      dr.school_id                AS "schoolId",
      dr.school_level             AS "schoolLevel",
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
      to_char(dr.sleep_time, 'HH24:MI') AS "sleepTime",
      to_char(dr.wake_time, 'HH24:MI')  AS "wakeTime",
      COALESCE(dr.reading_together, false) AS "readingTogether",
      dr.shine_moment             AS "shineMoment",
      dr.teacher_narrative        AS "teacherNarrative",
      dr.home_guidance            AS "homeGuidance",
      dr.teacher_highlight        AS "teacherHighlight",
      dr.teacher_followup         AS "teacherFollowup",
      dr.parent_message           AS "parentMessage",
      dr.parent_read_confirmed    AS "parentReadConfirmed",
      dr.parent_read_at           AS "parentReadAt",
      dr.status,
      COALESCE(dr.created_from_class_report, false) AS "createdFromClassReport",
      dr.class_id                 AS "classId"
    FROM dr_daily_reports dr
    JOIN core_students cs ON cs.id = dr.student_id
    LEFT JOIN core_classes cc ON cc.id = dr.class_id
    LEFT JOIN dr_play_centres pc ON pc.id = dr.play_centre_id
    WHERE dr.student_id = ${studentId}
      AND dr.report_date = ${date}::date
      AND dr.status IN ('submitted', 'read')
    LIMIT 1
  `;

  const h = headerRows[0] as Record<string, unknown> | undefined;
  if (!h) {
    // No per-student report — still publish the class report if the teacher
    // submitted one for this class/date.
    const classOnly = await buildClassReportOnlyReport(access.info, studentId, date);
    return classOnly ? { ok: true, report: classOnly } : { ok: false, reason: 'not_found' };
  }

  const reportId = Number(h.id);
  const playCentreId = h.playCentreId != null ? Number(h.playCentreId) : null;
  const classId = Number(h.classId ?? 0);
  const schoolId = h.schoolId != null ? Number(h.schoolId) : null;
  const schoolLevel = normalizeSchoolLevel(h.schoolLevel);
  const schoolIdFilter = schoolId ?? -1;
  const isPrimary = schoolLevel === 'primary';
  const selectedPlayCentreId = playCentreId ?? -1;

  const playCentresPromise =
    schoolLevel === 'kindergarten'
      ? schoolId == null
        ? sql`
            SELECT
              pc.name,
              pc.name_id AS "nameId",
              (pc.id = ${selectedPlayCentreId}) AS selected
            FROM dr_play_centres pc
            WHERE pc.is_active = true
            ORDER BY pc.sort_order
          `
        : sql`
            SELECT
              pc.name,
              pc.name_id AS "nameId",
              (pc.id = ${selectedPlayCentreId}) AS selected
            FROM dr_play_centres pc
            WHERE pc.is_active = true
              AND pc.school_id = ${schoolId}
            ORDER BY pc.sort_order
          `
      : Promise.resolve([]);

  const subjectsPromise = isPrimary
    ? sql`
        SELECT
          ds.id AS "subjectId",
          ds.learning_area_id AS "learningAreaId",
          COALESCE(la.name, ds.subject_name) AS "subjectName",
          la.name_id AS "subjectNameId",
          ds.topic,
          ds.activities,
          ds.teacher_note AS "teacherNote",
          ds.note_to_parents AS "noteToParents",
          ds.daily_score AS "dailyScore",
          ds.score_label AS "scoreLabel",
          ds.homework_given AS "homeworkGiven",
          ds.homework,
          ds.homework_due_date::text AS "homeworkDueDate",
          pn.note AS "privateNote",
          COALESCE(
            (SELECT ARRAY_AGG(atl.skill ORDER BY atl.skill)
             FROM dr_subject_atl_skills atl WHERE atl.subject_id = ds.id),
            '{}'::varchar[]
          ) AS "atlSkills",
          COALESCE(
            (SELECT ARRAY_AGG(mc.name ORDER BY mc.sort_order)
             FROM dr_subject_characters sc
             JOIN dr_muslim_characters mc ON mc.id = sc.character_id
             WHERE sc.subject_id = ds.id),
            '{}'::varchar[]
          ) AS "characters"
        FROM dr_daily_report_subjects ds
        LEFT JOIN dr_learning_areas la ON la.id = ds.learning_area_id
        LEFT JOIN dr_subject_private_notes pn
          ON pn.subject_id = ds.id AND pn.student_id = ${studentId}
        WHERE ds.report_id = ${reportId}
          AND (
            ds.audience_type = 'all'
            OR EXISTS (
              SELECT 1 FROM dr_subject_audiences sa
              WHERE sa.subject_id = ds.id AND sa.student_id = ${studentId}
            )
          )
        ORDER BY ds.sort_order, ds.id
      `
    : Promise.resolve([]);

  const homeTipsPromise = isPrimary
    ? sql`
        SELECT t.name, t.name_id AS "nameId"
        FROM dr_report_home_tips rht
        JOIN dr_home_support_tips t ON t.id = rht.tip_id
        WHERE rht.report_id = ${reportId}
        ORDER BY t.sort_order, t.id
      `
    : Promise.resolve([]);

  const studentMediaPromise = isPrimary
    ? sql`
        SELECT
          id,
          media_type AS "mediaType",
          url,
          thumbnail_url AS "thumbnailUrl",
          caption,
          sort_order AS "sortOrder"
        FROM dr_daily_report_media
        WHERE report_id = ${reportId}
        ORDER BY sort_order, id
      `
    : Promise.resolve([]);

  const [
    teacherNames,
    charRows,
    playCentreRowsRaw,
    laRows,
    vocabRows,
    tilawahRows,
    memorizeRows,
    subjectRows,
    tipRows,
    mediaRows,
    observeRows,
    classReportRows,
  ] = await Promise.all([
    Number.isFinite(classId) && classId > 0
      ? getTeacherNamesForClass(classId, studentId)
      : Promise.resolve([] as string[]),
    sql`
      SELECT
        mc.name,
        mc.name_id AS "nameId",
        EXISTS (
          SELECT 1 FROM dr_report_characters rc
          WHERE rc.report_id = ${reportId} AND rc.character_id = mc.id
        ) AS selected
      FROM dr_muslim_characters mc
      WHERE mc.is_active = true
        AND (mc.school_id IS NULL OR mc.school_id = ${schoolIdFilter})
      ORDER BY mc.sort_order
    `,
    playCentresPromise,
    sql`
      SELECT
        la.name,
        la.name_id AS "nameId",
        (rla.id IS NOT NULL) AS selected,
        rla.rating
      FROM dr_learning_areas la
      LEFT JOIN dr_report_learning_areas rla
        ON rla.area_id = la.id AND rla.report_id = ${reportId}
      WHERE la.is_active = true
        AND (la.school_level = ${schoolLevel} OR la.school_level = 'all')
        AND (la.school_id IS NULL OR la.school_id = ${schoolIdFilter})
      ORDER BY la.sort_order
    `,
    sql`
      SELECT word, meaning
      FROM dr_report_vocabulary
      WHERE report_id = ${reportId}
      ORDER BY sort_order
    `,
    sql`
      SELECT
        tilawah_method  AS "tilawahMethod",
        tilawah_jilid   AS "tilawahJilid",
        tilawah_page    AS "tilawahPage",
        rating,
        rating_label    AS "ratingLabel"
      FROM dr_tilawah_records
      WHERE report_id = ${reportId}
      LIMIT 1
    `,
    sql`
      SELECT
        surah_name   AS "surahName",
        verse_note   AS "verseNote",
        rating,
        rating_label AS "ratingLabel"
      FROM dr_memorize_records
      WHERE report_id = ${reportId}
      ORDER BY sort_order
    `,
    subjectsPromise,
    homeTipsPromise,
    studentMediaPromise,
    // Selected observe chips only (parent UI filters to selected).
    sql`
      SELECT
        d.id AS "domainId",
        d.name AS "domainName",
        d.name_id AS "domainNameId",
        d.sort_order AS "domainSort",
        o.id AS "optionId",
        o.name AS "optionName",
        o.name_id AS "optionNameId",
        o.sort_order AS "optionSort",
        true AS selected
      FROM dr_observe_domains d
      JOIN dr_observe_options o ON o.domain_id = d.id AND o.is_active = true
      JOIN dr_report_observe_options ro
        ON ro.report_id = ${reportId} AND ro.option_id = o.id
      WHERE d.is_active = true
        AND (d.school_level = ${schoolLevel} OR d.school_level = 'all')
        AND (d.school_id IS NULL OR d.school_id = ${schoolIdFilter})
      ORDER BY d.sort_order, o.sort_order, o.id
    `,
    Number.isFinite(classId) && classId > 0
      ? sql`
          SELECT id, theme, teacher_note AS "teacherNote"
          FROM dr_class_reports
          WHERE class_id = ${classId}
            AND report_date = ${date}::date
            AND status = 'submitted'
          LIMIT 1
        `
      : Promise.resolve([]),
  ]);

  const playCentreRows = (
    playCentreRowsRaw as { name: string; nameId: string | null; selected: boolean }[]
  ).map((r) => ({
    name: r.name,
    nameId: r.nameId ?? null,
    selected: Boolean(r.selected),
  }));

  const subjects: DailyReportSubject[] = (
    subjectRows as {
      subjectName: string;
      subjectNameId: string | null;
      learningAreaId: number | null;
      topic: string | null;
      activities: string | null;
      teacherNote: string | null;
      noteToParents: string | null;
      dailyScore: number | null;
      scoreLabel: string | null;
      homeworkGiven: boolean | null;
      homework: string | null;
      homeworkDueDate: string | null;
      privateNote: string | null;
      atlSkills: unknown;
      characters: unknown;
    }[]
  ).map((r) => ({
    subjectName: r.subjectName,
    subjectNameId: r.subjectNameId ?? null,
    learningAreaId: r.learningAreaId != null ? Number(r.learningAreaId) : null,
    topic: r.topic ?? null,
    activities: r.activities ?? null,
    teacherNote: r.teacherNote ?? null,
    noteToParents: r.noteToParents ?? null,
    dailyScore: r.dailyScore != null ? Number(r.dailyScore) : null,
    scoreLabel: r.scoreLabel ?? null,
    homeworkGiven: Boolean(r.homeworkGiven) || Boolean(r.homework?.trim()),
    homework: r.homework ?? null,
    homeworkDueDate: r.homeworkDueDate ? normalizeDate(r.homeworkDueDate) : null,
    atlSkills: toStringArray(r.atlSkills),
    characters: toStringArray(r.characters),
    privateNote: r.privateNote ?? null,
  }));

  const homeTips: DailyReportHomeTip[] = (
    tipRows as { name: string; nameId: string | null }[]
  ).map((r) => ({
    name: r.name,
    nameId: r.nameId,
  }));

  const studentMedia: DailyReportStudentMedia[] = (
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
    mediaType: m.mediaType as DailyReportStudentMedia['mediaType'],
    url: m.url,
    thumbnailUrl: m.thumbnailUrl ?? null,
    caption: m.caption ?? null,
    sortOrder: Number(m.sortOrder),
  }));

  const domainMap = new Map<number, DailyReportObserveDomain>();
  for (const row of observeRows as {
    domainId: number;
    domainName: string;
    domainNameId: string | null;
    optionName: string;
    optionNameId: string | null;
    selected: boolean;
  }[]) {
    const domainId = Number(row.domainId);
    let domain = domainMap.get(domainId);
    if (!domain) {
      domain = {
        name: row.domainName,
        nameId: row.domainNameId,
        options: [],
      };
      domainMap.set(domainId, domain);
    }
    domain.options.push({
      name: row.optionName,
      nameId: row.optionNameId,
      selected: Boolean(row.selected),
    });
  }
  const observeDomains = Array.from(domainMap.values());

  let classReport: ClassReportInfo | null = null;
  const crRow = classReportRows[0] as
    | { id: number; theme: string | null; teacherNote: string | null }
    | undefined;
  if (crRow) {
    const crId = Number(crRow.id);
    const classMediaRows = await sql`
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
        classMediaRows as {
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

  // A shell row with no class report left to show carries nothing for parents.
  if (Boolean(h.createdFromClassReport) && !classReport) {
    return { ok: false, reason: 'not_found' };
  }

  const tilawahRaw = tilawahRows[0] as {
    tilawahMethod: string;
    tilawahJilid: number | null;
    tilawahPage: number | null;
    rating: number | null;
    ratingLabel: string | null;
  } | undefined;

  const tilawah: DailyReportTilawah | null = tilawahRaw
    ? {
        method: tilawahRaw.tilawahMethod as DailyReportTilawah['method'],
        jilid: tilawahRaw.tilawahJilid != null ? Number(tilawahRaw.tilawahJilid) : null,
        page: tilawahRaw.tilawahPage != null ? Number(tilawahRaw.tilawahPage) : null,
        rating: tilawahRaw.rating != null ? Number(tilawahRaw.rating) : null,
        ratingLabel: tilawahRaw.ratingLabel ?? null,
      }
    : null;

  const memorize: DailyReportMemorize[] = (
    memorizeRows as {
      surahName: string;
      verseNote: string | null;
      rating: number | null;
      ratingLabel: string | null;
    }[]
  ).map((r) => ({
    surahName: r.surahName,
    verseNote: r.verseNote ?? null,
    rating: r.rating != null ? Number(r.rating) : null,
    ratingLabel: r.ratingLabel ?? null,
  }));

  let messages: DailyReportMessage[] = [];
  try {
    const msgRows = await sql`
      SELECT
        id,
        author_role AS "authorRole",
        body,
        created_at AS "createdAt"
      FROM dr_daily_report_messages
      WHERE report_id = ${reportId}
      ORDER BY created_at ASC, id ASC
    `;
    messages = (
      msgRows as { id: number; authorRole: string; body: string; createdAt: unknown }[]
    ).map((m) => ({
      id: Number(m.id),
      authorRole: m.authorRole === 'staff' ? 'staff' : 'parent',
      body: m.body,
      createdAt: m.createdAt != null ? String(m.createdAt) : null,
    }));
  } catch {
    messages = [];
  }
  if (
    messages.length === 0 &&
    typeof h.parentMessage === 'string' &&
    h.parentMessage.trim()
  ) {
    messages = [
      {
        id: 0,
        authorRole: 'parent',
        body: h.parentMessage.trim(),
        createdAt: null,
      },
    ];
  }

  const report: DailyReportFull = {
    id: reportId,
    studentName: String(h.studentName ?? ''),
    className: String(h.className ?? ''),
    reportDate: normalizeDate(h.reportDate),
    schoolLevel,
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
    sleepTime: (h.sleepTime as string | null) ?? null,
    wakeTime: (h.wakeTime as string | null) ?? null,
    readingTogether: Boolean(h.readingTogether),
    shineMoment: (h.shineMoment as string | null) ?? null,
    teacherNarrative: (h.teacherNarrative as string | null) ?? null,
    homeGuidance: (h.homeGuidance as string | null) ?? null,
    teacherHighlight: (h.teacherHighlight as string | null) ?? null,
    teacherFollowup: (h.teacherFollowup as string | null) ?? null,
    parentMessage: (h.parentMessage as string | null) ?? null,
    messages,
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
    playCentres: playCentreRows,
    learningAreas: (
      laRows as { name: string; nameId: string | null; selected: boolean; rating: number | null }[]
    ).map((r) => ({
      name: r.name,
      nameId: r.nameId,
      selected: Boolean(r.selected),
      rating: r.rating != null ? Number(r.rating) : null,
    })),
    vocabulary: vocabRows as DailyReportFull['vocabulary'],
    subjects,
    observeDomains,
    homeTips,
    studentMedia,
    classReport,
    tilawah,
    memorize,
    // ERP creates an empty shell row when a class report is submitted without
    // per-student reports — render just the class report for those.
    classReportOnly: Boolean(h.createdFromClassReport) && classReport != null,
  };

  return { ok: true, report };
}

export type ParentCornerUpdate = {
  parentMessage?: string | null;
  parentReadConfirmed?: boolean;
  sleepTime?: string | null;
  wakeTime?: string | null;
  readingTogether?: boolean;
};

function normalizeTimeHHMM(v: string | null | undefined): string | null {
  if (v == null || v === '') return null;
  const m = String(v).match(/^(\d{2}:\d{2})/);
  return m ? m[1] : null;
}

export async function updateDailyReportParentCorner(
  viewerUserId: number,
  viewerRole: string,
  studentId: number,
  date: string,
  input: ParentCornerUpdate,
): Promise<
  | { ok: true; patch: DailyReportParentPatch }
  | {
      ok: false;
      reason: 'forbidden' | 'unsupported_level' | 'bad_date' | 'not_found' | 'future_date';
    }
> {
  if (!isValidISODate(date)) return { ok: false, reason: 'bad_date' };

  const today = todayWibDate();
  if (date > today) return { ok: false, reason: 'future_date' };

  const access = await assertDailyReportAccess(viewerUserId, viewerRole, studentId);
  if (!access.ok) {
    return {
      ok: false,
      reason:
        access.reason === 'forbidden'
          ? 'forbidden'
          : access.reason === 'not_found'
            ? 'not_found'
            : 'unsupported_level',
    };
  }
  const isKg = isKindergartenStudent(access.info);

  const existing = await sql`
    SELECT id, school_id, parent_message
    FROM dr_daily_reports
    WHERE student_id = ${studentId}
      AND report_date = ${date}::date
      AND status IN ('submitted', 'read')
    LIMIT 1
  `;

  const row = existing[0] as
    | { id: number; school_id: number | null; parent_message: string | null }
    | undefined;
  if (!row) return { ok: false, reason: 'not_found' };

  // Non-empty parentMessage → append to thread. Empty/null does not wipe history.
  const appendBody =
    input.parentMessage !== undefined && input.parentMessage != null
      ? input.parentMessage.trim()
      : '';
  const message = appendBody ? appendBody : undefined;

  const readConfirmed = input.parentReadConfirmed;
  const sleepTime =
    isKg && input.sleepTime !== undefined ? normalizeTimeHHMM(input.sleepTime) : undefined;
  const wakeTime =
    isKg && input.wakeTime !== undefined ? normalizeTimeHHMM(input.wakeTime) : undefined;
  const readingTogether =
    isKg && input.readingTogether !== undefined ? Boolean(input.readingTogether) : undefined;

  if (sleepTime !== undefined || wakeTime !== undefined || readingTogether !== undefined) {
    const [cur] = await sql`
      SELECT
        to_char(sleep_time, 'HH24:MI') AS "sleepTime",
        to_char(wake_time, 'HH24:MI') AS "wakeTime",
        COALESCE(reading_together, false) AS "readingTogether"
      FROM dr_daily_reports
      WHERE id = ${row.id}
      LIMIT 1
    `;
    const nextSleep =
      sleepTime !== undefined
        ? sleepTime
        : ((cur as { sleepTime?: string | null } | undefined)?.sleepTime ?? null);
    const nextWake =
      wakeTime !== undefined
        ? wakeTime
        : ((cur as { wakeTime?: string | null } | undefined)?.wakeTime ?? null);
    const nextReading =
      readingTogether !== undefined
        ? readingTogether
        : Boolean((cur as { readingTogether?: boolean } | undefined)?.readingTogether);
    await sql`
      UPDATE dr_daily_reports
      SET
        sleep_time = ${nextSleep}::time,
        wake_time = ${nextWake}::time,
        reading_together = ${nextReading},
        updated_at = now()
      WHERE id = ${row.id}
        AND student_id = ${studentId}
    `;
  }

  if (message !== undefined) {
    try {
      const [{ c }] = (await sql`
        SELECT COUNT(*)::int AS c FROM dr_daily_report_messages WHERE report_id = ${row.id}
      `) as [{ c: number }];
      if (Number(c) === 0 && row.parent_message?.trim()) {
        await sql`
          INSERT INTO dr_daily_report_messages (school_id, report_id, author_role, author_user_id, body)
          VALUES (${row.school_id}, ${row.id}, 'parent', NULL, ${row.parent_message.trim()})
        `;
      }
      await sql`
        INSERT INTO dr_daily_report_messages (school_id, report_id, author_role, author_user_id, body)
        VALUES (${row.school_id}, ${row.id}, 'parent', ${viewerUserId}, ${message})
      `;
      // Re-open CRM ticket when parent posts (including after closed)
      try {
        await sql`
          UPDATE dr_daily_reports
          SET message_ticket_status = 'open',
              message_ticket_closed_at = NULL,
              message_ticket_closed_by = NULL,
              updated_at = now()
          WHERE id = ${row.id}
        `;
      } catch {
        // Columns may not exist until ERP migration 0063
      }
      try {
        const { notifyParentDrMessageBackground } = await import(
          '@/lib/parent-dr-message-notify'
        );
        notifyParentDrMessageBackground({
          studentId,
          reportId: Number(row.id),
          schoolId: row.school_id != null ? Number(row.school_id) : null,
          messagePreview: message,
        });
      } catch (err) {
        console.error('[daily-reports] parent message notify failed', err);
      }
    } catch {
      // Table may not exist until ERP migration 0050 is applied — fall back to legacy column only
    }
  }

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

  const [patched] = await sql`
    SELECT
      parent_message AS "parentMessage",
      parent_read_confirmed AS "parentReadConfirmed",
      parent_read_at AS "parentReadAt",
      to_char(sleep_time, 'HH24:MI') AS "sleepTime",
      to_char(wake_time, 'HH24:MI') AS "wakeTime",
      COALESCE(reading_together, false) AS "readingTogether",
      status
    FROM dr_daily_reports
    WHERE id = ${row.id}
      AND student_id = ${studentId}
    LIMIT 1
  `;

  if (!patched) return { ok: false, reason: 'not_found' };

  const p = patched as {
    parentMessage: string | null;
    parentReadConfirmed: boolean;
    parentReadAt: unknown;
    sleepTime: string | null;
    wakeTime: string | null;
    readingTogether: boolean;
    status: string;
  };

  let messages: DailyReportMessage[] = [];
  try {
    const msgRows = await sql`
      SELECT
        id,
        author_role AS "authorRole",
        body,
        created_at AS "createdAt"
      FROM dr_daily_report_messages
      WHERE report_id = ${row.id}
      ORDER BY created_at ASC, id ASC
    `;
    messages = (
      msgRows as { id: number; authorRole: string; body: string; createdAt: unknown }[]
    ).map((m) => ({
      id: Number(m.id),
      authorRole: m.authorRole === 'staff' ? 'staff' : 'parent',
      body: m.body,
      createdAt: m.createdAt != null ? String(m.createdAt) : null,
    }));
  } catch {
    if (p.parentMessage?.trim()) {
      messages = [
        {
          id: 0,
          authorRole: 'parent',
          body: p.parentMessage.trim(),
          createdAt: null,
        },
      ];
    }
  }

  void invalidateDailyReportCalendarCache(studentId);

  return {
    ok: true,
    patch: {
      parentMessage: p.parentMessage ?? null,
      parentReadConfirmed: Boolean(p.parentReadConfirmed),
      parentReadAt: p.parentReadAt != null ? String(p.parentReadAt) : null,
      sleepTime: p.sleepTime ?? null,
      wakeTime: p.wakeTime ?? null,
      readingTogether: Boolean(p.readingTogether),
      status: p.status === 'read' ? 'read' : 'submitted',
      messages,
    },
  };
}

export async function getDailyReportSummaryRange(
  viewerUserId: number,
  viewerRole: string,
  studentId: number,
  from: string,
  to: string,
): Promise<DailyReportSummaryResponse | null> {
  if (!isValidISODate(from) || !isValidISODate(to)) return null;

  const access = await assertDailyReportAccess(viewerUserId, viewerRole, studentId);
  if (!access.ok) return null;
  const isPrimary = isPrimaryStudent(access.info);

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

  const schoolLevelFilter = isPrimary ? 'primary' : 'kindergarten';

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
      AND (la.school_level = ${schoolLevelFilter} OR la.school_level = 'all')
    GROUP BY la.id, la.name, la.name_id, la.sort_order
    ORDER BY la.sort_order
  `;

  const moodRows = isPrimary
    ? []
    : await sql`
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



export async function getUpcomingHomework(
  viewerUserId: number,
  viewerRole: string,
  studentId: number,
): Promise<
  | { ok: true; items: DailyReportHomeworkItem[] }
  | { ok: false; reason: 'forbidden' | 'unsupported_level' | 'not_found' }
> {
  const access = await assertDailyReportAccess(viewerUserId, viewerRole, studentId);
  if (!access.ok) {
    return {
      ok: false,
      reason:
        access.reason === 'forbidden'
          ? 'forbidden'
          : access.reason === 'not_found'
            ? 'not_found'
            : 'unsupported_level',
    };
  }
  if (!isPrimaryStudent(access.info)) {
    return { ok: true, items: [] };
  }

  const rows = await sql`
    SELECT
      COALESCE(la.name, ds.subject_name) AS "subjectName",
      la.name_id AS "subjectNameId",
      ds.homework,
      ds.homework_due_date::text AS "homeworkDueDate",
      dr.report_date::text AS "assignedDate"
    FROM dr_daily_report_subjects ds
    JOIN dr_daily_reports dr ON dr.id = ds.report_id
    LEFT JOIN dr_learning_areas la ON la.id = ds.learning_area_id
    WHERE dr.student_id = ${studentId}
      AND dr.status != 'draft'
      AND ds.homework_given = true
      AND ds.homework IS NOT NULL
      AND TRIM(ds.homework) <> ''
      AND ds.homework_due_date >= CURRENT_DATE
      AND (
        ds.audience_type = 'all'
        OR EXISTS (
          SELECT 1 FROM dr_subject_audiences sa
          WHERE sa.subject_id = ds.id AND sa.student_id = ${studentId}
        )
      )
    ORDER BY ds.homework_due_date ASC
    LIMIT 5
  `;

  return {
    ok: true,
    items: (
      rows as {
        subjectName: string;
        subjectNameId: string | null;
        homework: string;
        homeworkDueDate: string;
        assignedDate: string;
      }[]
    ).map((r) => ({
      subjectName: r.subjectName,
      subjectNameId: r.subjectNameId ?? null,
      homework: r.homework,
      homeworkDueDate: normalizeDate(r.homeworkDueDate),
      assignedDate: normalizeDate(r.assignedDate),
    })),
  };
}

export async function getStudentSubjectOptions(
  viewerUserId: number,
  viewerRole: string,
  studentId: number,
): Promise<
  | { ok: true; subjects: DailyReportSubjectOption[] }
  | { ok: false; reason: 'forbidden' | 'unsupported_level' | 'not_found' }
> {
  const access = await assertDailyReportAccess(viewerUserId, viewerRole, studentId);
  if (!access.ok) {
    return {
      ok: false,
      reason:
        access.reason === 'forbidden'
          ? 'forbidden'
          : access.reason === 'not_found'
            ? 'not_found'
            : 'unsupported_level',
    };
  }
  if (!isPrimaryStudent(access.info)) {
    return { ok: true, subjects: [] };
  }

  const rows = await sql`
    SELECT DISTINCT
      la.id AS "learningAreaId",
      la.name,
      la.name_id AS "nameId",
      la.sort_order AS "sortOrder"
    FROM dr_daily_report_subjects ds
    JOIN dr_learning_areas la ON la.id = ds.learning_area_id
    JOIN dr_daily_reports dr ON dr.id = ds.report_id
    WHERE dr.student_id = ${studentId}
      AND dr.status != 'draft'
      AND (
        ds.audience_type = 'all'
        OR EXISTS (
          SELECT 1 FROM dr_subject_audiences sa
          WHERE sa.subject_id = ds.id AND sa.student_id = ${studentId}
        )
      )
    ORDER BY la.sort_order, la.name
  `;

  return {
    ok: true,
    subjects: (
      rows as {
        learningAreaId: number;
        name: string;
        nameId: string | null;
      }[]
    ).map((r) => ({
      learningAreaId: Number(r.learningAreaId),
      name: r.name,
      nameId: r.nameId ?? null,
    })),
  };
}

export async function getSubjectHistory(
  viewerUserId: number,
  viewerRole: string,
  studentId: number,
  learningAreaId: number,
): Promise<
  | { ok: true; items: DailyReportSubjectHistoryItem[] }
  | { ok: false; reason: 'forbidden' | 'unsupported_level' | 'not_found' | 'bad_request' }
> {
  if (!Number.isFinite(learningAreaId) || learningAreaId <= 0) {
    return { ok: false, reason: 'bad_request' };
  }

  const access = await assertDailyReportAccess(viewerUserId, viewerRole, studentId);
  if (!access.ok) {
    return {
      ok: false,
      reason:
        access.reason === 'forbidden'
          ? 'forbidden'
          : access.reason === 'not_found'
            ? 'not_found'
            : 'unsupported_level',
    };
  }
  if (!isPrimaryStudent(access.info)) {
    return { ok: true, items: [] };
  }

  const rows = await sql`
    SELECT
      dr.report_date::text AS "reportDate",
      ds.topic,
      ds.activities,
      ds.homework_given AS "homeworkGiven",
      ds.homework,
      ds.homework_due_date::text AS "homeworkDueDate",
      ds.note_to_parents AS "noteToParents",
      pn.note AS "privateNote",
      COALESCE(
        (SELECT ARRAY_AGG(atl.skill ORDER BY atl.skill)
         FROM dr_subject_atl_skills atl WHERE atl.subject_id = ds.id),
        '{}'::varchar[]
      ) AS "atlSkills",
      COALESCE(
        (SELECT ARRAY_AGG(mc.name ORDER BY mc.sort_order)
         FROM dr_subject_characters sc
         JOIN dr_muslim_characters mc ON mc.id = sc.character_id
         WHERE sc.subject_id = ds.id),
        '{}'::varchar[]
      ) AS "characters"
    FROM dr_daily_report_subjects ds
    JOIN dr_daily_reports dr ON dr.id = ds.report_id
    LEFT JOIN dr_subject_private_notes pn
      ON pn.subject_id = ds.id AND pn.student_id = ${studentId}
    WHERE dr.student_id = ${studentId}
      AND ds.learning_area_id = ${learningAreaId}
      AND dr.status != 'draft'
      AND (
        ds.audience_type = 'all'
        OR EXISTS (
          SELECT 1 FROM dr_subject_audiences sa
          WHERE sa.subject_id = ds.id AND sa.student_id = ${studentId}
        )
      )
    ORDER BY dr.report_date DESC
    LIMIT 40
  `;

  return {
    ok: true,
    items: (
      rows as {
        reportDate: string;
        topic: string | null;
        activities: string | null;
        homeworkGiven: boolean | null;
        homework: string | null;
        homeworkDueDate: string | null;
        noteToParents: string | null;
        privateNote: string | null;
        atlSkills: unknown;
        characters: unknown;
      }[]
    ).map((r) => ({
      reportDate: normalizeDate(r.reportDate),
      topic: r.topic ?? null,
      activities: r.activities ?? null,
      homeworkGiven: Boolean(r.homeworkGiven) || Boolean(r.homework?.trim()),
      homework: r.homework ?? null,
      homeworkDueDate: r.homeworkDueDate ? normalizeDate(r.homeworkDueDate) : null,
      atlSkills: toStringArray(r.atlSkills),
      characters: toStringArray(r.characters),
      privateNote: r.privateNote ?? null,
      noteToParents: r.noteToParents ?? null,
    })),
  };
}

export type PortalMessageTicket = {
  reportId: number;
  reportDate: string;
  ticketStatus: 'open' | 'closed';
  lastBody: string | null;
  lastAuthorRole: 'parent' | 'staff' | null;
  lastAt: string | null;
};

export async function listPortalMessageTickets(
  viewerUserId: number,
  viewerRole: string,
  studentId: number,
): Promise<{ ok: true; tickets: PortalMessageTicket[] } | { ok: false; reason: 'forbidden' }> {
  const access = await assertDailyReportAccess(viewerUserId, viewerRole, studentId);
  if (!access.ok) return { ok: false, reason: 'forbidden' };

  const rows = await sql`
    WITH last_msg AS (
      SELECT DISTINCT ON (m.report_id)
        m.report_id,
        m.body AS last_body,
        m.author_role AS last_author_role,
        m.created_at AS last_at
      FROM dr_daily_report_messages m
      ORDER BY m.report_id, m.created_at DESC, m.id DESC
    )
    SELECT
      dr.id AS report_id,
      dr.report_date::text AS report_date,
      COALESCE(dr.message_ticket_status, 'open') AS ticket_status,
      lm.last_body,
      lm.last_author_role,
      lm.last_at
    FROM dr_daily_reports dr
    INNER JOIN last_msg lm ON lm.report_id = dr.id
    WHERE dr.student_id = ${studentId}
      AND dr.status IN ('submitted', 'read')
    ORDER BY lm.last_at DESC NULLS LAST, dr.report_date DESC
    LIMIT 60
  `;

  return {
    ok: true,
    tickets: (rows as Record<string, unknown>[]).map((r) => ({
      reportId: Number(r.report_id),
      reportDate: normalizeDate(r.report_date),
      ticketStatus: String(r.ticket_status) === 'closed' ? 'closed' : 'open',
      lastBody: r.last_body == null ? null : String(r.last_body),
      lastAuthorRole:
        r.last_author_role === 'staff' || r.last_author_role === 'parent'
          ? (r.last_author_role as 'parent' | 'staff')
          : null,
      lastAt:
        r.last_at instanceof Date
          ? r.last_at.toISOString()
          : r.last_at == null
            ? null
            : String(r.last_at),
    })),
  };
}
