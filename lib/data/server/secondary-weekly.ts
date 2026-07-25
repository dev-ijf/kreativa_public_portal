import { sql } from '@/lib/db/client';
import { isStudentVisibleToViewer } from '@/lib/data/server/attendance';
import { assertSecondaryDailyStudent } from '@/lib/data/server/secondary-daily';
import {
  emptySecondaryWeeklyPayload,
  type SecondaryWeeklyDayRecap,
  type SecondaryWeeklyIbadahStats,
  type SecondaryWeeklyPayload,
  type SecondaryWeeklyResponse,
  type SecondaryWeeklySubjectCard,
} from '@/lib/portal/secondary-weekly-shared';
import type { EffortLevel, UnderstandingLevel } from '@/lib/portal/secondary-daily-shared';

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

async function nextWeeklyId(): Promise<number> {
  const rows = await sql`SELECT COALESCE(MAX(id), 0)::int8 + 1 AS id FROM dr_weekly_reflections`;
  return Number((rows[0] as { id: number }).id);
}

async function resolveWeekForDate(
  schoolId: number,
  academicYearId: number,
  date: string,
): Promise<{
  id: number;
  weekLabel: string | null;
  dateFrom: string;
  dateTo: string;
} | null> {
  const rows = await sql`
    SELECT
      id,
      week_label AS "weekLabel",
      date_from::text AS "dateFrom",
      date_to::text AS "dateTo"
    FROM wl_week_configs
    WHERE school_id = ${schoolId}
      AND academic_year_id = ${academicYearId}
      AND date_from <= ${date}::date
      AND date_to >= ${date}::date
    ORDER BY week_number ASC
    LIMIT 1
  `;
  const r = rows[0] as
    | { id: number; weekLabel: string | null; dateFrom: string; dateTo: string }
    | undefined;
  if (!r) return null;
  return {
    id: Number(r.id),
    weekLabel: r.weekLabel,
    dateFrom: normalizeDate(r.dateFrom),
    dateTo: normalizeDate(r.dateTo),
  };
}

function computeStats(days: SecondaryWeeklyDayRecap[]): SecondaryWeeklyIbadahStats {
  let totalObligatory = 0;
  let maxObligatory = 0;
  let daysWithDhuha = 0;
  let daysWithTilawah = 0;
  let daysWithDhikr = 0;

  for (const d of days) {
    if (!d.isOnPeriod) {
      maxObligatory += 5;
      totalObligatory +=
        (d.fajrPrayer ? 1 : 0) +
        (d.asrPrayer ? 1 : 0) +
        (d.maghribPrayer ? 1 : 0) +
        (d.ishaPrayer ? 1 : 0) +
        (d.zuhurPrayer === 'well_done' || d.zuhurPrayer === 'needs_guidance' ? 1 : 0);
      if (d.dhuhaPrayer === 'yes') daysWithDhuha += 1;
      if (d.morningDhikr || d.eveningDhikr) daysWithDhikr += 1;
    }
    if (d.tilawahDone) daysWithTilawah += 1;
  }

  return {
    totalObligatoryPrayers: totalObligatory,
    maxObligatoryPrayers: Math.max(maxObligatory, 0),
    daysWithDhuha,
    daysWithTilawah,
    daysWithDhikr,
    daysInWeek: days.length,
  };
}

async function loadDailyRecap(
  studentId: number,
  dateFrom: string,
  dateTo: string,
): Promise<SecondaryWeeklyDayRecap[]> {
  const rows = await sql`
    SELECT
      report_date::text AS "reportDate",
      fajr_prayer AS "fajrPrayer",
      dhuha_prayer AS "dhuhaPrayer",
      zuhur_prayer AS "zuhurPrayer",
      asr_prayer AS "asrPrayer",
      maghrib_prayer AS "maghribPrayer",
      isha_prayer AS "ishaPrayer",
      tahajud_prayer AS "tahajudPrayer",
      morning_dhikr AS "morningDhikr",
      evening_dhikr AS "eveningDhikr",
      tilawah_done AS "tilawahDone",
      memorisation_done AS "memorisationDone",
      energy_level AS "energyLevel",
      is_on_period AS "isOnPeriod"
    FROM dr_daily_reports
    WHERE student_id = ${studentId}
      AND report_date >= ${dateFrom}::date
      AND report_date <= ${dateTo}::date
      AND status IN ('submitted', 'read', 'draft')
    ORDER BY report_date ASC
  `;

  return (
    rows as {
      reportDate: string;
      fajrPrayer: unknown;
      dhuhaPrayer: string | null;
      zuhurPrayer: string | null;
      asrPrayer: unknown;
      maghribPrayer: unknown;
      ishaPrayer: unknown;
      tahajudPrayer: unknown;
      morningDhikr: unknown;
      eveningDhikr: unknown;
      tilawahDone: unknown;
      memorisationDone: unknown;
      energyLevel: number | null;
      isOnPeriod: unknown;
    }[]
  ).map((r) => ({
    reportDate: normalizeDate(r.reportDate),
    fajrPrayer: toBool(r.fajrPrayer),
    dhuhaPrayer:
      r.dhuhaPrayer === 'yes' || r.dhuhaPrayer === 'no' ? r.dhuhaPrayer : null,
    zuhurPrayer:
      r.zuhurPrayer === 'well_done' ||
      r.zuhurPrayer === 'needs_guidance' ||
      r.zuhurPrayer === 'did_not_pray'
        ? r.zuhurPrayer
        : null,
    asrPrayer: toBool(r.asrPrayer),
    maghribPrayer: toBool(r.maghribPrayer),
    ishaPrayer: toBool(r.ishaPrayer),
    tahajudPrayer: toBool(r.tahajudPrayer),
    morningDhikr: toBool(r.morningDhikr),
    eveningDhikr: toBool(r.eveningDhikr),
    tilawahDone: toBool(r.tilawahDone),
    memorisationDone: toBool(r.memorisationDone),
    energyLevel: r.energyLevel != null ? Number(r.energyLevel) : null,
    isOnPeriod: toBool(r.isOnPeriod),
  }));
}

function parseUnderstanding(v: unknown): UnderstandingLevel | null {
  if (v === 'fully' || v === 'mostly' || v === 'partially' || v === 'need_help') return v;
  return null;
}

function parseEffort(v: unknown): EffortLevel | null {
  if (
    v === 'maximum' ||
    v === 'good' ||
    v === 'could_do_more' ||
    v === 'needs_improvement'
  ) {
    return v;
  }
  return null;
}

async function loadWeekSubjects(
  studentId: number,
  schoolId: number,
  academicYearId: number,
  dateFrom: string,
  dateTo: string,
): Promise<SecondaryWeeklySubjectCard[]> {
  const rows = await sql`
    SELECT
      s.id AS "sessionId",
      s.session_date::text AS "reportDate",
      s.title,
      sub.name AS "subjectName",
      sr.understanding,
      sr.effort,
      sr.quick_note AS "quickNote"
    FROM lms_sessions s
    JOIN lms_courses c ON c.id = s.course_id
    JOIN lms_subjects sub ON sub.id = c.subject_id
    JOIN lms_course_enrollments ce
      ON ce.course_id = c.id AND ce.student_id = ${studentId}
    LEFT JOIN dr_daily_reports dr
      ON dr.student_id = ${studentId}
      AND dr.report_date = s.session_date
    LEFT JOIN dr_session_reflections sr
      ON sr.session_id = s.id AND sr.report_id = dr.id
    WHERE c.school_id = ${schoolId}
      AND c.academic_year_id = ${academicYearId}
      AND ce.status = 'active'
      AND c.deleted_at IS NULL
      AND s.session_date >= ${dateFrom}::date
      AND s.session_date <= ${dateTo}::date
    ORDER BY s.session_date ASC, s.start_time ASC NULLS LAST, s.id ASC
  `;

  return (rows as Record<string, unknown>[]).map((r) => ({
    sessionId: Number(r.sessionId),
    reportDate: normalizeDate(r.reportDate),
    subjectName: String(r.subjectName ?? ''),
    title: String(r.title ?? ''),
    understanding: parseUnderstanding(r.understanding),
    effort: parseEffort(r.effort),
    quickNote: (r.quickNote as string | null) ?? null,
  }));
}

export async function getSecondaryWeeklyByDate(
  viewerUserId: number,
  viewerRole: string,
  studentId: number,
  date: string,
): Promise<
  | { ok: true; week: SecondaryWeeklyResponse }
  | {
      ok: false;
      reason: 'forbidden' | 'unsupported_level' | 'bad_date' | 'missing_class' | 'no_week';
    }
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

  const week = await resolveWeekForDate(gate.schoolId, gate.academicYearId, date);
  if (!week) return { ok: false, reason: 'no_week' };

  const dailyRecap = await loadDailyRecap(studentId, week.dateFrom, week.dateTo);
  const stats = computeStats(dailyRecap);
  const weekSubjects = await loadWeekSubjects(
    studentId,
    gate.schoolId,
    gate.academicYearId,
    week.dateFrom,
    week.dateTo,
  );

  const rows = await sql`
    SELECT
      id,
      status,
      akhlaq_reflection AS "akhlaqReflection",
      best_learning_moment AS "bestLearningMoment",
      most_challenging AS "mostChallenging",
      unanswered_question AS "unansweredQuestion",
      weekly_goal AS "weeklyGoal",
      message_to_homeroom AS "messageToHomeroom",
      parent_ibadah_confirmed AS "parentIbadahConfirmed",
      parent_ibadah_name AS "parentIbadahName",
      parent_ibadah_confirmed_at AS "parentIbadahConfirmedAt"
    FROM dr_weekly_reflections
    WHERE student_id = ${studentId}
      AND week_config_id = ${week.id}
    LIMIT 1
  `;

  const r = rows[0] as Record<string, unknown> | undefined;
  if (!r) {
    return {
      ok: true,
      week: {
        weekConfigId: week.id,
        weekLabel: week.weekLabel,
        dateFrom: week.dateFrom,
        dateTo: week.dateTo,
        reflectionId: null,
        status: null,
        payload: emptySecondaryWeeklyPayload(),
        stats,
        dailyRecap,
        weekSubjects,
        parentIbadahConfirmed: false,
        parentIbadahName: null,
        parentIbadahConfirmedAt: null,
      },
    };
  }

  return {
    ok: true,
    week: {
      weekConfigId: week.id,
      weekLabel: week.weekLabel,
      dateFrom: week.dateFrom,
      dateTo: week.dateTo,
      reflectionId: Number(r.id),
      status: (r.status as 'draft' | 'submitted') ?? null,
      payload: {
        akhlaqReflection: (r.akhlaqReflection as string | null) ?? null,
        bestLearningMoment: (r.bestLearningMoment as string | null) ?? null,
        mostChallenging: (r.mostChallenging as string | null) ?? null,
        unansweredQuestion: (r.unansweredQuestion as string | null) ?? null,
        weeklyGoal: (r.weeklyGoal as string | null) ?? null,
        messageToHomeroom: (r.messageToHomeroom as string | null) ?? null,
      },
      stats,
      dailyRecap,
      weekSubjects,
      parentIbadahConfirmed: Boolean(r.parentIbadahConfirmed),
      parentIbadahName: (r.parentIbadahName as string | null) ?? null,
      parentIbadahConfirmedAt:
        r.parentIbadahConfirmedAt != null ? String(r.parentIbadahConfirmedAt) : null,
    },
  };
}

export async function upsertSecondaryWeekly(
  viewerUserId: number,
  viewerRole: string,
  studentId: number,
  date: string,
  payload: SecondaryWeeklyPayload,
  submit: boolean,
): Promise<
  | { ok: true; week: SecondaryWeeklyResponse }
  | {
      ok: false;
      reason:
        | 'forbidden'
        | 'unsupported_level'
        | 'bad_date'
        | 'missing_class'
        | 'no_week';
    }
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

  const week = await resolveWeekForDate(gate.schoolId, gate.academicYearId, date);
  if (!week) return { ok: false, reason: 'no_week' };

  const dailyRecap = await loadDailyRecap(studentId, week.dateFrom, week.dateTo);
  const stats = computeStats(dailyRecap);
  const status = submit ? 'submitted' : 'draft';

  const existing = await sql`
    SELECT id FROM dr_weekly_reflections
    WHERE student_id = ${studentId} AND week_config_id = ${week.id}
    LIMIT 1
  `;
  const existingId = (existing[0] as { id?: number } | undefined)?.id;

  const trim = (v: string | null) => v?.trim() || null;

  if (existingId != null) {
    await sql`
      UPDATE dr_weekly_reflections SET
        akhlaq_reflection = ${trim(payload.akhlaqReflection)},
        best_learning_moment = ${trim(payload.bestLearningMoment)},
        most_challenging = ${trim(payload.mostChallenging)},
        unanswered_question = ${trim(payload.unansweredQuestion)},
        weekly_goal = ${trim(payload.weeklyGoal)},
        message_to_homeroom = ${trim(payload.messageToHomeroom)},
        total_obligatory_prayers = ${stats.totalObligatoryPrayers},
        days_with_dhuha = ${stats.daysWithDhuha},
        days_with_tilawah = ${stats.daysWithTilawah},
        days_with_dhikr = ${stats.daysWithDhikr},
        status = ${status},
        submitted_at = CASE WHEN ${submit} THEN COALESCE(submitted_at, now()) ELSE submitted_at END,
        updated_at = now()
      WHERE id = ${Number(existingId)}
    `;
  } else {
    const id = await nextWeeklyId();
    await sql`
      INSERT INTO dr_weekly_reflections (
        id, school_id, academic_year_id, week_config_id, student_id, class_id,
        akhlaq_reflection, best_learning_moment, most_challenging,
        unanswered_question, weekly_goal, message_to_homeroom,
        total_obligatory_prayers, days_with_dhuha, days_with_tilawah, days_with_dhikr,
        status, submitted_at
      ) VALUES (
        ${id}, ${gate.schoolId}, ${gate.academicYearId}, ${week.id}, ${studentId}, ${gate.classId},
        ${trim(payload.akhlaqReflection)}, ${trim(payload.bestLearningMoment)}, ${trim(payload.mostChallenging)},
        ${trim(payload.unansweredQuestion)}, ${trim(payload.weeklyGoal)}, ${trim(payload.messageToHomeroom)},
        ${stats.totalObligatoryPrayers}, ${stats.daysWithDhuha}, ${stats.daysWithTilawah}, ${stats.daysWithDhikr},
        ${status}, ${submit ? new Date().toISOString() : null}
      )
    `;
  }

  return getSecondaryWeeklyByDate(viewerUserId, viewerRole, studentId, date);
}

export async function confirmSecondaryWeeklyParentIbadah(
  viewerUserId: number,
  viewerRole: string,
  studentId: number,
  date: string,
  confirmed: boolean,
  parentName: string | null,
): Promise<
  | { ok: true; week: SecondaryWeeklyResponse }
  | {
      ok: false;
      reason:
        | 'forbidden'
        | 'unsupported_level'
        | 'bad_date'
        | 'missing_class'
        | 'no_week'
        | 'not_found';
    }
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

  const week = await resolveWeekForDate(gate.schoolId, gate.academicYearId, date);
  if (!week) return { ok: false, reason: 'no_week' };

  const existing = await sql`
    SELECT id FROM dr_weekly_reflections
    WHERE student_id = ${studentId} AND week_config_id = ${week.id}
    LIMIT 1
  `;
  const existingId = (existing[0] as { id?: number } | undefined)?.id;
  if (existingId == null) return { ok: false, reason: 'not_found' };

  const name = parentName?.trim() || null;

  if (confirmed) {
    await sql`
      UPDATE dr_weekly_reflections SET
        parent_ibadah_confirmed = true,
        parent_ibadah_name = ${name},
        parent_ibadah_confirmed_at = now(),
        updated_at = now()
      WHERE id = ${Number(existingId)}
    `;
    await sql`
      UPDATE dr_daily_reports SET
        parent_ibadah_confirmed = true,
        parent_ibadah_name = ${name},
        parent_ibadah_confirmed_at = now(),
        updated_at = now()
      WHERE student_id = ${studentId}
        AND report_date >= ${week.dateFrom}::date
        AND report_date <= ${week.dateTo}::date
    `;
  } else {
    await sql`
      UPDATE dr_weekly_reflections SET
        parent_ibadah_confirmed = false,
        parent_ibadah_name = NULL,
        parent_ibadah_confirmed_at = NULL,
        updated_at = now()
      WHERE id = ${Number(existingId)}
    `;
    await sql`
      UPDATE dr_daily_reports SET
        parent_ibadah_confirmed = false,
        parent_ibadah_name = NULL,
        parent_ibadah_confirmed_at = NULL,
        updated_at = now()
      WHERE student_id = ${studentId}
        AND report_date >= ${week.dateFrom}::date
        AND report_date <= ${week.dateTo}::date
    `;
  }

  return getSecondaryWeeklyByDate(viewerUserId, viewerRole, studentId, date);
}
