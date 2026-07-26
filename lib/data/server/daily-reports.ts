import { sql } from '@/lib/db/client';
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
  DailyReportFull,
  DailyReportHomeTip,
  DailyReportMemorize,
  DailyReportObserveDomain,
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

/** Allow KG + Primary students for parent Daily Reports. */
export async function assertDailyReportStudent(
  studentId: number,
): Promise<{ ok: true } | { ok: false; reason: UnsupportedReason }> {
  const info = await getStudentLevelInfo(studentId);
  if (!info) return { ok: false, reason: 'not_found' };
  if (!isDailyReportStudent(info)) return { ok: false, reason: 'unsupported_level' };
  return { ok: true };
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

export async function getDailyReportCalendarMonth(
  viewerUserId: number,
  viewerRole: string,
  studentId: number,
  year: number,
  monthIndex0: number,
): Promise<DailyReportCalendarDay[] | null> {
  const ok = await isStudentVisibleToViewer(viewerUserId, viewerRole, studentId);
  if (!ok) return null;
  const level = await assertDailyReportStudent(studentId);
  if (!level.ok) return null;

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
  | { ok: false; reason: 'forbidden' | 'unsupported_level' | 'bad_date' | 'not_found' }
> {
  if (!isValidISODate(date)) return { ok: false, reason: 'bad_date' };

  const ok = await isStudentVisibleToViewer(viewerUserId, viewerRole, studentId);
  if (!ok) return { ok: false, reason: 'forbidden' };

  const level = await assertDailyReportStudent(studentId);
  if (!level.ok) {
    return { ok: false, reason: level.reason === 'not_found' ? 'not_found' : 'unsupported_level' };
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
      dr.shine_moment             AS "shineMoment",
      dr.teacher_narrative        AS "teacherNarrative",
      dr.home_guidance            AS "homeGuidance",
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
  const schoolId = h.schoolId != null ? Number(h.schoolId) : null;
  const schoolLevel = normalizeSchoolLevel(h.schoolLevel);
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
      AND (mc.school_id IS NULL OR mc.school_id = ${schoolId})
    ORDER BY mc.sort_order
  `;

  const playCentreRows =
    schoolLevel === 'kindergarten'
      ? await sql`
          SELECT
            pc.name,
            pc.name_id AS "nameId",
            (pc.id = ${playCentreId}) AS selected
          FROM dr_play_centres pc
          WHERE pc.is_active = true
            AND (pc.school_id = ${schoolId} OR ${schoolId} IS NULL)
          ORDER BY pc.sort_order
        `
      : [];

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
      AND (la.school_level = ${schoolLevel} OR la.school_level = 'all')
      AND (la.school_id IS NULL OR la.school_id = ${schoolId})
    ORDER BY la.sort_order
  `;

  const vocabRows = await sql`
    SELECT word, meaning
    FROM dr_report_vocabulary
    WHERE report_id = ${reportId}
    ORDER BY sort_order
  `;

  const tilawahRows = await sql`
    SELECT
      tilawah_method  AS "tilawahMethod",
      tilawah_jilid   AS "tilawahJilid",
      tilawah_page    AS "tilawahPage",
      rating,
      rating_label    AS "ratingLabel"
    FROM dr_tilawah_records
    WHERE report_id = ${reportId}
    LIMIT 1
  `;

  const memorizeRows = await sql`
    SELECT
      surah_name   AS "surahName",
      verse_note   AS "verseNote",
      rating,
      rating_label AS "ratingLabel"
    FROM dr_memorize_records
    WHERE report_id = ${reportId}
    ORDER BY sort_order
  `;

  let subjects: DailyReportSubject[] = [];
  let observeDomains: DailyReportObserveDomain[] = [];
  let homeTips: DailyReportHomeTip[] = [];
  let studentMedia: DailyReportStudentMedia[] = [];

  if (schoolLevel === 'primary') {
    const subjectRows = await sql`
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
    `;

    const toStringArray = (v: unknown): string[] => {
      if (Array.isArray(v)) return v.map(String).filter(Boolean);
      if (typeof v === 'string') {
        return v.replace(/[{}]/g, '').split(',').map((s) => s.trim()).filter(Boolean);
      }
      return [];
    };

    subjects = (
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

    const observeRows = await sql`
      SELECT
        d.id AS "domainId",
        d.name AS "domainName",
        d.name_id AS "domainNameId",
        d.sort_order AS "domainSort",
        o.id AS "optionId",
        o.name AS "optionName",
        o.name_id AS "optionNameId",
        o.sort_order AS "optionSort",
        EXISTS (
          SELECT 1 FROM dr_report_observe_options ro
          WHERE ro.report_id = ${reportId} AND ro.option_id = o.id
        ) AS selected
      FROM dr_observe_domains d
      JOIN dr_observe_options o ON o.domain_id = d.id AND o.is_active = true
      WHERE d.is_active = true
        AND (d.school_level = 'primary' OR d.school_level = 'all')
        AND (d.school_id IS NULL OR d.school_id = ${schoolId})
      ORDER BY d.sort_order, o.sort_order, o.id
    `;

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
    observeDomains = Array.from(domainMap.values());

    const tipRows = await sql`
      SELECT t.name, t.name_id AS "nameId"
      FROM dr_report_home_tips rht
      JOIN dr_home_support_tips t ON t.id = rht.tip_id
      WHERE rht.report_id = ${reportId}
      ORDER BY t.sort_order, t.id
    `;
    homeTips = (tipRows as { name: string; nameId: string | null }[]).map((r) => ({
      name: r.name,
      nameId: r.nameId,
    }));

    const mediaRows = await sql`
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
    `;
    studentMedia = (
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
  }

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
    shineMoment: (h.shineMoment as string | null) ?? null,
    teacherNarrative: (h.teacherNarrative as string | null) ?? null,
    homeGuidance: (h.homeGuidance as string | null) ?? null,
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
    subjects,
    observeDomains,
    homeTips,
    studentMedia,
    classReport,
    tilawah,
    memorize,
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
      reason: 'forbidden' | 'unsupported_level' | 'bad_date' | 'not_found' | 'future_date';
    }
> {
  if (!isValidISODate(date)) return { ok: false, reason: 'bad_date' };

  const today = new Date().toISOString().slice(0, 10);
  if (date > today) return { ok: false, reason: 'future_date' };

  const ok = await isStudentVisibleToViewer(viewerUserId, viewerRole, studentId);
  if (!ok) return { ok: false, reason: 'forbidden' };

  const level = await assertDailyReportStudent(studentId);
  if (!level.ok) {
    return { ok: false, reason: level.reason === 'not_found' ? 'not_found' : 'unsupported_level' };
  }

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
  if (!result.ok) {
    return {
      ok: false,
      reason: result.reason === 'unsupported_level' ? 'unsupported_level' : 'not_found',
    };
  }
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

  const level = await assertDailyReportStudent(studentId);
  if (!level.ok) return null;

  const info = await getStudentLevelInfo(studentId);
  const isPrimary = info ? isPrimaryStudent(info) : false;

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

export async function getUpcomingHomework(
  viewerUserId: number,
  viewerRole: string,
  studentId: number,
): Promise<
  | { ok: true; items: DailyReportHomeworkItem[] }
  | { ok: false; reason: 'forbidden' | 'unsupported_level' | 'not_found' }
> {
  const ok = await isStudentVisibleToViewer(viewerUserId, viewerRole, studentId);
  if (!ok) return { ok: false, reason: 'forbidden' };

  const level = await assertDailyReportStudent(studentId);
  if (!level.ok) {
    return { ok: false, reason: level.reason === 'not_found' ? 'not_found' : 'unsupported_level' };
  }
  const info = await getStudentLevelInfo(studentId);
  if (!info || !isPrimaryStudent(info)) {
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
  const ok = await isStudentVisibleToViewer(viewerUserId, viewerRole, studentId);
  if (!ok) return { ok: false, reason: 'forbidden' };

  const level = await assertDailyReportStudent(studentId);
  if (!level.ok) {
    return { ok: false, reason: level.reason === 'not_found' ? 'not_found' : 'unsupported_level' };
  }
  const info = await getStudentLevelInfo(studentId);
  if (!info || !isPrimaryStudent(info)) {
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

  const ok = await isStudentVisibleToViewer(viewerUserId, viewerRole, studentId);
  if (!ok) return { ok: false, reason: 'forbidden' };

  const level = await assertDailyReportStudent(studentId);
  if (!level.ok) {
    return { ok: false, reason: level.reason === 'not_found' ? 'not_found' : 'unsupported_level' };
  }
  const info = await getStudentLevelInfo(studentId);
  if (!info || !isPrimaryStudent(info)) {
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
