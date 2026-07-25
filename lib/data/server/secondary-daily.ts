import { sql } from '@/lib/db/client';
import { isStudentVisibleToViewer } from '@/lib/data/server/attendance';
import { monthRange } from '@/lib/data/server/habits';
import {
  isSecondaryOrHighSchoolStudent,
  resolveDrSchoolLevel,
  type DrSchoolLevel,
} from '@/lib/portal/is-kindergarten';
import {
  emptySecondaryDailyPayload,
  GOOD_DEED_TYPES,
  secondaryDailyScorePct,
  type DhuhaPrayer,
  type EffortLevel,
  type GoodDeedType,
  type SecondaryDailyCalendarDay,
  type SecondaryDailyDayResponse,
  type SecondaryDailyPayload,
  type SecondaryDailySummaryResponse,
  type SecondarySessionCard,
  type UnderstandingLevel,
  type ZuhurPrayer,
} from '@/lib/portal/secondary-daily-shared';

function normalizeDate(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'string') return value.slice(0, 10);
  return String(value ?? '');
}

function isValidISODate(d: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  return !Number.isNaN(Date.parse(`${d}T12:00:00Z`));
}

function toBool(v: unknown): boolean {
  if (v === true || v === false) return v;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    return s === 't' || s === 'true' || s === '1' || s === 'yes';
  }
  return Boolean(v);
}

async function getStudentContext(studentId: number): Promise<{
  levelGradeName: string | null;
  levelOrder: number | null;
  schoolName: string | null;
  className: string | null;
  schoolId: number;
  classId: number | null;
  academicYearId: number | null;
} | null> {
  const rows = await sql`
    SELECT
      s.school_id AS "schoolId",
      sc.name AS "schoolName",
      h.class_id AS "classId",
      c.name AS "className",
      h.academic_year_id AS "academicYearId",
      lg.name AS "levelGradeName",
      lg.level_order AS "levelOrder"
    FROM core_students s
    JOIN core_schools sc ON sc.id = s.school_id
    LEFT JOIN LATERAL (
      SELECT ch.class_id, ch.academic_year_id, ch.level_grade_id
      FROM core_student_class_histories ch
      WHERE ch.student_id = s.id AND ch.status = 'active'
      ORDER BY ch.id DESC
      LIMIT 1
    ) h ON true
    LEFT JOIN core_classes c ON c.id = h.class_id
    LEFT JOIN core_level_grades lg ON lg.id = h.level_grade_id
    WHERE s.id = ${studentId}
    LIMIT 1
  `;
  const r = rows[0] as
    | {
        schoolId: number;
        schoolName: string | null;
        classId: number | null;
        className: string | null;
        academicYearId: number | null;
        levelGradeName: string | null;
        levelOrder: number | null;
      }
    | undefined;
  if (!r) return null;
  return {
    schoolId: Number(r.schoolId),
    schoolName: r.schoolName ?? null,
    className: r.className ?? null,
    classId: r.classId != null ? Number(r.classId) : null,
    academicYearId: r.academicYearId != null ? Number(r.academicYearId) : null,
    levelGradeName: r.levelGradeName ?? null,
    levelOrder: r.levelOrder != null ? Number(r.levelOrder) : null,
  };
}

export async function assertSecondaryDailyStudent(
  studentId: number,
): Promise<
  | {
      ok: true;
      schoolId: number;
      classId: number;
      academicYearId: number;
      schoolLevel: DrSchoolLevel;
    }
  | { ok: false; reason: 'not_found' | 'unsupported_level' | 'missing_class' }
> {
  const ctx = await getStudentContext(studentId);
  if (!ctx) return { ok: false, reason: 'not_found' };
  if (!isSecondaryOrHighSchoolStudent(ctx)) {
    return { ok: false, reason: 'unsupported_level' };
  }
  if (ctx.classId == null || ctx.academicYearId == null) {
    return { ok: false, reason: 'missing_class' };
  }
  return {
    ok: true,
    schoolId: ctx.schoolId,
    classId: ctx.classId,
    academicYearId: ctx.academicYearId,
    schoolLevel: resolveDrSchoolLevel(ctx),
  };
}

async function resolveTermId(
  schoolId: number,
  academicYearId: number,
  date: string,
): Promise<number | null> {
  const rows = await sql`
    SELECT term_id AS "termId"
    FROM wl_week_configs
    WHERE school_id = ${schoolId}
      AND academic_year_id = ${academicYearId}
      AND date_from <= ${date}::date
      AND date_to >= ${date}::date
    ORDER BY week_number ASC
    LIMIT 1
  `;
  const id = (rows[0] as { termId?: number | null } | undefined)?.termId;
  return id != null ? Number(id) : null;
}

async function nextTableId(table: 'dr_daily_good_deeds' | 'dr_session_reflections'): Promise<number> {
  if (table === 'dr_daily_good_deeds') {
    const rows = await sql`SELECT COALESCE(MAX(id), 0)::int8 + 1 AS id FROM dr_daily_good_deeds`;
    return Number((rows[0] as { id: number }).id);
  }
  const rows = await sql`SELECT COALESCE(MAX(id), 0)::int8 + 1 AS id FROM dr_session_reflections`;
  return Number((rows[0] as { id: number }).id);
}

function parseDhuha(v: unknown): DhuhaPrayer | null {
  if (v === 'yes' || v === 'no') return v;
  if (v === true) return 'yes';
  if (v === false) return 'no';
  return null;
}

function parseZuhur(v: unknown): ZuhurPrayer | null {
  if (v === 'well_done' || v === 'needs_guidance' || v === 'did_not_pray') return v;
  return null;
}

function parseUnderstanding(v: unknown): UnderstandingLevel | null {
  if (v === 'fully' || v === 'mostly' || v === 'partially' || v === 'need_help') return v;
  return null;
}

function parseEffort(v: unknown): EffortLevel | null {
  if (v === 'maximum' || v === 'good' || v === 'could_do_more' || v === 'needs_improvement') {
    return v;
  }
  return null;
}

async function loadSessionsForDay(
  studentId: number,
  schoolId: number,
  academicYearId: number,
  date: string,
  reportId: number | null,
): Promise<SecondarySessionCard[]> {
  const rows =
    reportId != null
      ? await sql`
          SELECT
            s.id AS "sessionId",
            s.title,
            s.start_time::text AS "startTime",
            s.end_time::text AS "endTime",
            s.period_number AS "periodNumber",
            sub.name AS "subjectName",
            sa.status AS "attendanceStatus",
            sr.understanding,
            sr.effort,
            sr.quick_note AS "quickNote"
          FROM lms_sessions s
          JOIN lms_courses c ON c.id = s.course_id
          JOIN lms_subjects sub ON sub.id = c.subject_id
          JOIN lms_course_enrollments ce
            ON ce.course_id = c.id AND ce.student_id = ${studentId}
          LEFT JOIN lms_session_attendances sa
            ON sa.session_id = s.id AND sa.student_id = ${studentId}
          LEFT JOIN dr_session_reflections sr
            ON sr.session_id = s.id AND sr.report_id = ${reportId}
          WHERE s.session_date = ${date}::date
            AND c.school_id = ${schoolId}
            AND c.academic_year_id = ${academicYearId}
            AND ce.status = 'active'
            AND c.deleted_at IS NULL
          ORDER BY s.start_time NULLS LAST, s.period_number NULLS LAST, s.id
        `
      : await sql`
          SELECT
            s.id AS "sessionId",
            s.title,
            s.start_time::text AS "startTime",
            s.end_time::text AS "endTime",
            s.period_number AS "periodNumber",
            sub.name AS "subjectName",
            sa.status AS "attendanceStatus",
            NULL::varchar AS understanding,
            NULL::varchar AS effort,
            NULL::text AS "quickNote"
          FROM lms_sessions s
          JOIN lms_courses c ON c.id = s.course_id
          JOIN lms_subjects sub ON sub.id = c.subject_id
          JOIN lms_course_enrollments ce
            ON ce.course_id = c.id AND ce.student_id = ${studentId}
          LEFT JOIN lms_session_attendances sa
            ON sa.session_id = s.id AND sa.student_id = ${studentId}
          WHERE s.session_date = ${date}::date
            AND c.school_id = ${schoolId}
            AND c.academic_year_id = ${academicYearId}
            AND ce.status = 'active'
            AND c.deleted_at IS NULL
          ORDER BY s.start_time NULLS LAST, s.period_number NULLS LAST, s.id
        `;

  return (
    rows as {
      sessionId: number;
      title: string;
      startTime: string | null;
      endTime: string | null;
      periodNumber: number | null;
      subjectName: string;
      attendanceStatus: string | null;
      understanding: string | null;
      effort: string | null;
      quickNote: string | null;
    }[]
  ).map((r) => ({
    sessionId: Number(r.sessionId),
    title: r.title,
    subjectName: r.subjectName,
    periodNumber: r.periodNumber != null ? Number(r.periodNumber) : null,
    startTime: r.startTime,
    endTime: r.endTime,
    attendanceStatus: r.attendanceStatus ?? null,
    understanding: parseUnderstanding(r.understanding),
    effort: parseEffort(r.effort),
    quickNote: r.quickNote ?? null,
  }));
}

async function loadGoodDeeds(reportId: number): Promise<SecondaryDailyPayload['goodDeeds']> {
  const rows = await sql`
    SELECT deed_type AS "deedType", custom_deed AS "customDeed"
    FROM dr_daily_good_deeds
    WHERE report_id = ${reportId}
    ORDER BY id
  `;
  return (
    rows as { deedType: string; customDeed: string | null }[]
  )
    .filter((r) => (GOOD_DEED_TYPES as readonly string[]).includes(r.deedType))
    .map((r) => ({
      deedType: r.deedType as GoodDeedType,
      customDeed: r.customDeed ?? null,
    }));
}

function rowToPayload(
  h: Record<string, unknown>,
  goodDeeds: SecondaryDailyPayload['goodDeeds'],
  sessions: SecondarySessionCard[],
): SecondaryDailyPayload {
  const energy =
    h.energyLevel != null && Number.isFinite(Number(h.energyLevel))
      ? Number(h.energyLevel)
      : null;

  return {
    fajrPrayer: toBool(h.fajrPrayer),
    asrPrayer: toBool(h.asrPrayer),
    maghribPrayer: toBool(h.maghribPrayer),
    ishaPrayer: toBool(h.ishaPrayer),
    tahajudPrayer: toBool(h.tahajudPrayer),
    morningDhikr: toBool(h.morningDhikr),
    eveningDhikr: toBool(h.eveningDhikr),
    tilawahDone: toBool(h.tilawahDone),
    memorisationDone: toBool(h.memorisationDone),
    dhuhaPrayer: parseDhuha(h.dhuhaPrayer),
    zuhurPrayer: parseZuhur(h.zuhurPrayer),
    energyLevel: energy != null && energy >= 1 && energy <= 5 ? energy : null,
    goodDeeds,
    sessionReflections: sessions.map((s) => ({
      sessionId: s.sessionId,
      subjectName: s.subjectName,
      understanding: s.understanding,
      effort: s.effort,
      quickNote: s.quickNote,
    })),
  };
}

export async function getSecondaryDailyByDate(
  viewerUserId: number,
  viewerRole: string,
  studentId: number,
  date: string,
): Promise<
  | { ok: true; day: SecondaryDailyDayResponse }
  | { ok: false; reason: 'forbidden' | 'unsupported_level' | 'bad_date' | 'missing_class' }
> {
  if (!isValidISODate(date)) return { ok: false, reason: 'bad_date' };

  const visible = await isStudentVisibleToViewer(viewerUserId, viewerRole, studentId);
  if (!visible) return { ok: false, reason: 'forbidden' };

  const gate = await assertSecondaryDailyStudent(studentId);
  if (!gate.ok) {
    return {
      ok: false,
      reason: gate.reason === 'missing_class' ? 'missing_class' : 'unsupported_level',
    };
  }

  const headerRows = await sql`
    SELECT
      id,
      status,
      fajr_prayer AS "fajrPrayer",
      asr_prayer AS "asrPrayer",
      maghrib_prayer AS "maghribPrayer",
      isha_prayer AS "ishaPrayer",
      tahajud_prayer AS "tahajudPrayer",
      morning_dhikr AS "morningDhikr",
      evening_dhikr AS "eveningDhikr",
      tilawah_done AS "tilawahDone",
      memorisation_done AS "memorisationDone",
      dhuha_prayer AS "dhuhaPrayer",
      zuhur_prayer AS "zuhurPrayer",
      energy_level AS "energyLevel"
    FROM dr_daily_reports
    WHERE student_id = ${studentId}
      AND report_date = ${date}::date
    LIMIT 1
  `;

  const h = headerRows[0] as Record<string, unknown> | undefined;
  const reportId = h?.id != null ? Number(h.id) : null;
  const sessions = await loadSessionsForDay(
    studentId,
    gate.schoolId,
    gate.academicYearId,
    date,
    reportId,
  );

  if (!h) {
    const payload = emptySecondaryDailyPayload();
    payload.sessionReflections = sessions.map((s) => ({
      sessionId: s.sessionId,
      subjectName: s.subjectName,
      understanding: null,
      effort: null,
      quickNote: null,
    }));
    return {
      ok: true,
      day: {
        reportId: null,
        reportDate: date,
        status: null,
        payload,
        sessions: sessions.map((s) => ({
          ...s,
          understanding: null,
          effort: null,
          quickNote: null,
        })),
      },
    };
  }

  const goodDeeds = await loadGoodDeeds(reportId!);
  const payload = rowToPayload(h, goodDeeds, sessions);

  return {
    ok: true,
    day: {
      reportId,
      reportDate: date,
      status: (h.status as SecondaryDailyDayResponse['status']) ?? null,
      payload,
      sessions,
    },
  };
}

export async function upsertSecondaryDailyDay(
  viewerUserId: number,
  viewerRole: string,
  studentId: number,
  date: string,
  payload: SecondaryDailyPayload,
): Promise<
  | { ok: true; day: SecondaryDailyDayResponse }
  | {
      ok: false;
      reason:
        | 'forbidden'
        | 'unsupported_level'
        | 'bad_date'
        | 'future_date'
        | 'missing_class'
        | 'bad_request';
    }
> {
  if (!isValidISODate(date)) return { ok: false, reason: 'bad_date' };
  const today = new Date().toISOString().slice(0, 10);
  if (date > today) return { ok: false, reason: 'future_date' };

  const visible = await isStudentVisibleToViewer(viewerUserId, viewerRole, studentId);
  if (!visible) return { ok: false, reason: 'forbidden' };

  const gate = await assertSecondaryDailyStudent(studentId);
  if (!gate.ok) {
    return {
      ok: false,
      reason: gate.reason === 'missing_class' ? 'missing_class' : 'unsupported_level',
    };
  }

  if (payload.energyLevel != null && (payload.energyLevel < 1 || payload.energyLevel > 5)) {
    return { ok: false, reason: 'bad_request' };
  }

  const termId = await resolveTermId(gate.schoolId, gate.academicYearId, date);
  const dhuha = payload.dhuhaPrayer;
  const zuhur = payload.zuhurPrayer;

  const existing = await sql`
    SELECT id FROM dr_daily_reports
    WHERE student_id = ${studentId} AND report_date = ${date}::date
    LIMIT 1
  `;
  const existingId = (existing[0] as { id?: number } | undefined)?.id;

  let reportId: number;
  if (existingId != null) {
    reportId = Number(existingId);
    await sql`
      UPDATE dr_daily_reports SET
        class_id = ${gate.classId},
        school_id = ${gate.schoolId},
        academic_year_id = ${gate.academicYearId},
        term_id = ${termId},
        school_level = ${gate.schoolLevel},
        fajr_prayer = ${payload.fajrPrayer},
        asr_prayer = ${payload.asrPrayer},
        maghrib_prayer = ${payload.maghribPrayer},
        isha_prayer = ${payload.ishaPrayer},
        tahajud_prayer = ${payload.tahajudPrayer},
        morning_dhikr = ${payload.morningDhikr},
        evening_dhikr = ${payload.eveningDhikr},
        tilawah_done = ${payload.tilawahDone},
        memorisation_done = ${payload.memorisationDone},
        dhuha_prayer = ${dhuha},
        zuhur_prayer = ${zuhur},
        energy_level = ${payload.energyLevel},
        status = 'submitted',
        submitted_by = ${viewerUserId},
        submitted_at = COALESCE(submitted_at, now()),
        updated_at = now()
      WHERE id = ${reportId}
    `;
  } else {
    const inserted = await sql`
      INSERT INTO dr_daily_reports (
        student_id, class_id, report_date,
        school_id, academic_year_id, term_id, school_level,
        fajr_prayer, asr_prayer, maghrib_prayer, isha_prayer,
        tahajud_prayer, morning_dhikr, evening_dhikr,
        tilawah_done, memorisation_done,
        dhuha_prayer, zuhur_prayer, energy_level,
        status, submitted_by, submitted_at
      ) VALUES (
        ${studentId}, ${gate.classId}, ${date}::date,
        ${gate.schoolId}, ${gate.academicYearId}, ${termId}, ${gate.schoolLevel},
        ${payload.fajrPrayer}, ${payload.asrPrayer}, ${payload.maghribPrayer}, ${payload.ishaPrayer},
        ${payload.tahajudPrayer}, ${payload.morningDhikr}, ${payload.eveningDhikr},
        ${payload.tilawahDone}, ${payload.memorisationDone},
        ${dhuha}, ${zuhur}, ${payload.energyLevel},
        'submitted', ${viewerUserId}, now()
      )
      RETURNING id
    `;
    reportId = Number((inserted[0] as { id: number }).id);
  }

  await sql`DELETE FROM dr_daily_good_deeds WHERE report_id = ${reportId}`;
  for (const deed of payload.goodDeeds) {
    if (!(GOOD_DEED_TYPES as readonly string[]).includes(deed.deedType)) continue;
    const id = await nextTableId('dr_daily_good_deeds');
    const custom =
      deed.deedType === 'other' ? deed.customDeed?.trim() || null : null;
    await sql`
      INSERT INTO dr_daily_good_deeds (id, report_id, deed_type, custom_deed)
      VALUES (${id}, ${reportId}, ${deed.deedType}, ${custom})
    `;
  }

  const sessions = await loadSessionsForDay(
    studentId,
    gate.schoolId,
    gate.academicYearId,
    date,
    reportId,
  );
  const allowedSessionIds = new Set(sessions.map((s) => s.sessionId));

  for (const ref of payload.sessionReflections) {
    if (!allowedSessionIds.has(ref.sessionId)) continue;
    const subject =
      sessions.find((s) => s.sessionId === ref.sessionId)?.subjectName ?? ref.subjectName;
    const existingRef = await sql`
      SELECT id FROM dr_session_reflections
      WHERE report_id = ${reportId} AND session_id = ${ref.sessionId}
      LIMIT 1
    `;
    const refId = (existingRef[0] as { id?: number } | undefined)?.id;
    if (refId != null) {
      await sql`
        UPDATE dr_session_reflections SET
          subject_name = ${subject},
          understanding = ${ref.understanding},
          effort = ${ref.effort},
          quick_note = ${ref.quickNote?.trim() || null},
          updated_at = now()
        WHERE id = ${Number(refId)}
      `;
    } else if (ref.understanding || ref.effort || ref.quickNote?.trim()) {
      const id = await nextTableId('dr_session_reflections');
      await sql`
        INSERT INTO dr_session_reflections (
          id, report_id, session_id, school_id, academic_year_id,
          subject_name, understanding, effort, quick_note
        ) VALUES (
          ${id}, ${reportId}, ${ref.sessionId}, ${gate.schoolId}, ${gate.academicYearId},
          ${subject}, ${ref.understanding}, ${ref.effort}, ${ref.quickNote?.trim() || null}
        )
      `;
    }
  }

  const day = await getSecondaryDailyByDate(viewerUserId, viewerRole, studentId, date);
  if (!day.ok) return { ok: false, reason: 'forbidden' };
  return { ok: true, day: day.day };
}

export async function getSecondaryDailyCalendarMonth(
  viewerUserId: number,
  viewerRole: string,
  studentId: number,
  year: number,
  monthIndex0: number,
): Promise<SecondaryDailyCalendarDay[] | null> {
  const visible = await isStudentVisibleToViewer(viewerUserId, viewerRole, studentId);
  if (!visible) return null;
  const gate = await assertSecondaryDailyStudent(studentId);
  if (!gate.ok) return null;

  const { from, toExclusive } = monthRange(year, monthIndex0);
  const rows = await sql`
    SELECT
      report_date::text AS "reportDate",
      fajr_prayer AS "fajrPrayer",
      asr_prayer AS "asrPrayer",
      maghrib_prayer AS "maghribPrayer",
      isha_prayer AS "ishaPrayer",
      tahajud_prayer AS "tahajudPrayer",
      morning_dhikr AS "morningDhikr",
      evening_dhikr AS "eveningDhikr",
      tilawah_done AS "tilawahDone",
      memorisation_done AS "memorisationDone",
      dhuha_prayer AS "dhuhaPrayer",
      zuhur_prayer AS "zuhurPrayer",
      energy_level AS "energyLevel"
    FROM dr_daily_reports
    WHERE student_id = ${studentId}
      AND report_date >= ${from}::date
      AND report_date < ${toExclusive}::date
      AND status IN ('submitted', 'read')
    ORDER BY report_date ASC
  `;

  return (rows as Record<string, unknown>[]).map((r) => {
    const payload = rowToPayload(r, [], []);
    return {
      date: normalizeDate(r.reportDate),
      hasEntry: true,
      scorePct: secondaryDailyScorePct(payload),
    };
  });
}

export async function getSecondaryDailySummaryRange(
  viewerUserId: number,
  viewerRole: string,
  studentId: number,
  from: string,
  to: string,
): Promise<SecondaryDailySummaryResponse | null> {
  if (!isValidISODate(from) || !isValidISODate(to)) return null;
  const visible = await isStudentVisibleToViewer(viewerUserId, viewerRole, studentId);
  if (!visible) return null;
  const gate = await assertSecondaryDailyStudent(studentId);
  if (!gate.ok) return null;

  const rows = await sql`
    SELECT
      dr.id,
      dr.report_date::text AS "reportDate",
      dr.fajr_prayer AS "fajrPrayer",
      dr.asr_prayer AS "asrPrayer",
      dr.maghrib_prayer AS "maghribPrayer",
      dr.isha_prayer AS "ishaPrayer",
      dr.tahajud_prayer AS "tahajudPrayer",
      dr.morning_dhikr AS "morningDhikr",
      dr.evening_dhikr AS "eveningDhikr",
      dr.tilawah_done AS "tilawahDone",
      dr.memorisation_done AS "memorisationDone",
      dr.dhuha_prayer AS "dhuhaPrayer",
      dr.zuhur_prayer AS "zuhurPrayer",
      dr.energy_level AS "energyLevel"
    FROM dr_daily_reports dr
    WHERE dr.student_id = ${studentId}
      AND dr.report_date >= ${from}::date
      AND dr.report_date <= ${to}::date
      AND dr.status IN ('submitted', 'read')
    ORDER BY dr.report_date ASC
  `;

  const list = rows as Record<string, unknown>[];
  if (list.length === 0) {
    return {
      totalDays: 0,
      avgScorePct: 0,
      prayerPct: 0,
      avgEnergy: null,
      goodDeedCount: 0,
      sessionReflectionPct: 0,
      dailyTrend: [],
    };
  }

  const reportIds = list.map((r) => Number(r.id));
  const deedRows =
    reportIds.length > 0
      ? await sql`
          SELECT COUNT(*)::int AS count
          FROM dr_daily_good_deeds
          WHERE report_id = ANY(${reportIds}::int8[])
        `
      : [];
  const goodDeedCount = Number((deedRows[0] as { count?: number } | undefined)?.count ?? 0);

  const refRows =
    reportIds.length > 0
      ? await sql`
          SELECT
            COUNT(*)::int AS total,
            COUNT(*) FILTER (
              WHERE understanding IS NOT NULL AND effort IS NOT NULL
            )::int AS filled
          FROM dr_session_reflections
          WHERE report_id = ANY(${reportIds}::int8[])
        `
      : [];
  const refTotal = Number((refRows[0] as { total?: number } | undefined)?.total ?? 0);
  const refFilled = Number((refRows[0] as { filled?: number } | undefined)?.filled ?? 0);

  let scoreSum = 0;
  let prayerDone = 0;
  let prayerTotal = 0;
  let energySum = 0;
  let energyCount = 0;
  const dailyTrend: { date: string; scorePct: number }[] = [];

  for (const r of list) {
    const payload = rowToPayload(r, [], []);
    const pct = secondaryDailyScorePct(payload);
    scoreSum += pct;
    dailyTrend.push({ date: normalizeDate(r.reportDate), scorePct: pct });

    const prayers = [
      payload.fajrPrayer,
      payload.asrPrayer,
      payload.maghribPrayer,
      payload.ishaPrayer,
      payload.dhuhaPrayer === 'yes',
      payload.zuhurPrayer === 'well_done' || payload.zuhurPrayer === 'needs_guidance',
    ];
    prayerTotal += prayers.length;
    prayerDone += prayers.filter(Boolean).length;

    if (payload.energyLevel != null) {
      energySum += payload.energyLevel;
      energyCount += 1;
    }
  }

  return {
    totalDays: list.length,
    avgScorePct: Math.round(scoreSum / list.length),
    prayerPct: prayerTotal > 0 ? Math.round((prayerDone / prayerTotal) * 100) : 0,
    avgEnergy: energyCount > 0 ? Math.round((energySum / energyCount) * 10) / 10 : null,
    goodDeedCount,
    sessionReflectionPct: refTotal > 0 ? Math.round((refFilled / refTotal) * 100) : 0,
    dailyTrend,
  };
}
