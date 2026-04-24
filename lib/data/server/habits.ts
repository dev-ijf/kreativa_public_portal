import { sql } from '@/lib/db/client';
import { isStudentVisibleToViewer } from '@/lib/data/server/attendance';
import {
  HABIT_BOOLEAN_KEYS,
  type HabitBooleanKey,
  type HabitCalendarDay,
  type HabitSummaryResponse,
  type OnTimeArrivalValue,
  type PortalHabitDayPayload,
} from '@/lib/portal/habits-shared';

export { HABIT_BOOLEAN_KEYS } from '@/lib/portal/habits-shared';
export type {
  HabitBooleanKey,
  HabitCalendarDay,
  HabitSummaryResponse,
  OnTimeArrivalValue,
  PortalHabitDayPayload,
} from '@/lib/portal/habits-shared';

const IBADAH_KEYS: HabitBooleanKey[] = [
  'fajr',
  'dhuhr',
  'asr',
  'maghrib',
  'isha',
  'dhuha',
  'tahajud',
  'read_quran',
  'sunnah_fasting',
  'pray_with_parents',
];

const DISIPLIN_KEYS: HabitBooleanKey[] = ['wake_up_early'];

const KARAKTER_KEYS: HabitBooleanKey[] = [
  'help_parents',
  'give_greetings',
  'smile_greet_polite',
  'parent_hug_pray',
  'child_tell_parents',
];

export type PortalHabitRow = {
  id: string;
  studentId: number;
  habitDate: string;
} & Record<HabitBooleanKey, boolean> & {
  onTimeArrival: OnTimeArrivalValue;
  quranJuzInfo: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

function normalizeDate(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'string') return value.slice(0, 10);
  return String(value ?? '');
}

function toBool(v: unknown): boolean {
  if (v === true || v === false) return v;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    return s === 't' || s === 'true' || s === '1';
  }
  return Boolean(v);
}

/** Normalize DB varchar to portal enum (write: store canonical strings). */
export function normalizeOnTimeFromDb(raw: unknown): OnTimeArrivalValue {
  if (raw == null || raw === '') return null;
  const s = String(raw).trim().toLowerCase();
  if (
    s === 'on_time' ||
    s === 'on-time' ||
    s === 'tepat' ||
    s === 'y' ||
    s === 'yes' ||
    s === 't' ||
    s === 'true' ||
    s === '1'
  ) {
    return 'on_time';
  }
  if (s === 'late' || s === 'terlambat' || s === 'n' || s === 'no' || s === 'f' || s === 'false' || s === '0') {
    return 'late';
  }
  if (
    s === 'permission' ||
    s === 'izin' ||
    s === 'excused' ||
    s === 'permit'
  ) {
    return 'permission';
  }
  if (s === 'sick' || s === 'sakit' || s === 'ill') {
    return 'sick';
  }
  if (s === 'holiday' || s === 'libur' || s === 'no_school') {
    return 'holiday';
  }
  return null;
}

export function onTimeToDb(v: OnTimeArrivalValue): string | null {
  if (v === 'on_time') return 'on_time';
  if (v === 'late') return 'late';
  if (v === 'permission') return 'permission';
  if (v === 'sick') return 'sick';
  if (v === 'holiday') return 'holiday';
  return null;
}

function mapHabitRow(r: Record<string, unknown>): PortalHabitRow {
  const bools = {} as Record<HabitBooleanKey, boolean>;
  for (const k of HABIT_BOOLEAN_KEYS) {
    bools[k] = toBool(r[k]);
  }
  return {
    id: String(r.id ?? ''),
    studentId: Number(r.student_id ?? r.studentId ?? 0),
    habitDate: normalizeDate(r.habit_date ?? r.habitDate),
    ...bools,
    onTimeArrival: normalizeOnTimeFromDb(r.on_time_arrival ?? r.onTimeArrival),
    quranJuzInfo: (r.quran_juz_info as string | null) ?? null,
    createdAt: r.created_at != null ? String(r.created_at) : null,
    updatedAt: r.updated_at != null ? String(r.updated_at) : null,
  };
}

function boolScore(row: Pick<PortalHabitRow, HabitBooleanKey>): { num: number; den: number } {
  let n = 0;
  for (const k of HABIT_BOOLEAN_KEYS) {
    if (row[k]) n += 1;
  }
  return { num: n, den: HABIT_BOOLEAN_KEYS.length };
}

function scorePct(row: Pick<PortalHabitRow, HabitBooleanKey>): number {
  const { num, den } = boolScore(row);
  if (den === 0) return 0;
  return Math.round((num / den) * 100);
}

function categoryAvg(
  rows: Pick<PortalHabitRow, HabitBooleanKey | 'onTimeArrival'>[],
  keys: HabitBooleanKey[],
  includeOnTime: boolean,
): number {
  if (rows.length === 0) return 0;
  let sum = 0;
  for (const row of rows) {
    let n = 0;
    let d = 0;
    for (const k of keys) {
      d += 1;
      if (row[k]) n += 1;
    }
    if (includeOnTime) {
      d += 1;
      const o = row.onTimeArrival;
      if (o === 'on_time' || o === 'permission' || o === 'sick' || o === 'holiday') {
        n += 1;
      }
    }
    sum += d > 0 ? (n / d) * 100 : 0;
  }
  return Math.round(sum / rows.length);
}

function isValidISODate(d: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  const t = Date.parse(`${d}T12:00:00Z`);
  return !Number.isNaN(t);
}

/** Month range for SQL `[from, toExclusive)` — strings match calendar month in local wall terms. */
export function monthRange(year: number, monthIndex0: number): { from: string; toExclusive: string } {
  const from = `${year}-${String(monthIndex0 + 1).padStart(2, '0')}-01`;
  const firstNextMonth = new Date(year, monthIndex0 + 1, 1);
  const toExclusive = `${firstNextMonth.getFullYear()}-${String(firstNextMonth.getMonth() + 1).padStart(2, '0')}-01`;
  return { from, toExclusive };
}

export async function getHabitCalendarMonth(
  viewerUserId: number,
  viewerRole: string,
  studentId: number,
  year: number,
  monthIndex0: number,
): Promise<HabitCalendarDay[] | null> {
  const ok = await isStudentVisibleToViewer(viewerUserId, viewerRole, studentId);
  if (!ok) return null;
  const { from, toExclusive } = monthRange(year, monthIndex0);

  const rows = await sql`
    SELECT
      habit_date::text AS habit_date,
      fajr, dhuhr, "asr", maghrib, isha, dhuha, tahajud, read_quran, sunnah_fasting,
      wake_up_early, help_parents, pray_with_parents, give_greetings, smile_greet_polite,
      parent_hug_pray, child_tell_parents
    FROM academic_habits
    WHERE student_id = ${studentId}
      AND habit_date >= ${from}::date
      AND habit_date < ${toExclusive}::date
    ORDER BY habit_date ASC
  `;

  const out: HabitCalendarDay[] = [];
  for (const raw of rows as Record<string, unknown>[]) {
    const row = mapHabitRow(raw);
    out.push({
      date: row.habitDate,
      hasEntry: true,
      scorePct: scorePct(row),
    });
  }
  return out;
}

export type GetHabitByDateResult =
  | { ok: true; row: PortalHabitRow | null }
  | { ok: false; reason: 'forbidden' | 'bad_date' };

export async function getHabitByDate(
  viewerUserId: number,
  viewerRole: string,
  studentId: number,
  habitDate: string,
): Promise<GetHabitByDateResult> {
  if (!isValidISODate(habitDate)) return { ok: false, reason: 'bad_date' };
  const visible = await isStudentVisibleToViewer(viewerUserId, viewerRole, studentId);
  if (!visible) return { ok: false, reason: 'forbidden' };

  const rows = await sql`
    SELECT
      id, student_id, habit_date::text AS habit_date,
      fajr, dhuhr, "asr", maghrib, isha, dhuha, tahajud, read_quran, sunnah_fasting,
      wake_up_early, help_parents, pray_with_parents, give_greetings, smile_greet_polite,
      on_time_arrival, parent_hug_pray, child_tell_parents, quran_juz_info,
      created_at, updated_at
    FROM academic_habits
    WHERE student_id = ${studentId}
      AND habit_date = ${habitDate}::date
    LIMIT 1
  `;
  if (rows.length === 0) return { ok: true, row: null };
  return { ok: true, row: mapHabitRow(rows[0] as Record<string, unknown>) };
}

export type UpsertHabitResult =
  | { ok: true; row: PortalHabitRow }
  | { ok: false; reason: 'forbidden' | 'future_date' | 'bad_request' | 'conflict' };

export async function upsertHabitDay(
  viewerUserId: number,
  viewerRole: string,
  studentId: number,
  habitDate: string,
  payload: PortalHabitDayPayload,
): Promise<UpsertHabitResult> {
  if (!isValidISODate(habitDate)) return { ok: false, reason: 'bad_request' };
  const ok = await isStudentVisibleToViewer(viewerUserId, viewerRole, studentId);
  if (!ok) return { ok: false, reason: 'forbidden' };

  const check = await sql`
    SELECT (${habitDate}::date <= CURRENT_DATE) AS ok
  `;
  if (!(check[0] as { ok?: boolean })?.ok) {
    return { ok: false, reason: 'future_date' };
  }

  const otdb = onTimeToDb(payload.onTimeArrival);
  const qinfo =
    typeof payload.quranJuzInfo === 'string' && payload.quranJuzInfo.trim()
      ? payload.quranJuzInfo.trim()
      : null;

  const vals = {
    fajr: payload.fajr,
    dhuhr: payload.dhuhr,
    asr: payload.asr,
    maghrib: payload.maghrib,
    isha: payload.isha,
    dhuha: payload.dhuha,
    tahajud: payload.tahajud,
    read_quran: payload.read_quran,
    sunnah_fasting: payload.sunnah_fasting,
    wake_up_early: payload.wake_up_early,
    help_parents: payload.help_parents,
    pray_with_parents: payload.pray_with_parents,
    give_greetings: payload.give_greetings,
    smile_greet_polite: payload.smile_greet_polite,
    parent_hug_pray: payload.parent_hug_pray,
    child_tell_parents: payload.child_tell_parents,
  };

  const rows = await sql`
    INSERT INTO academic_habits (
      student_id, habit_date,
      fajr, dhuhr, "asr", maghrib, isha, dhuha, tahajud, read_quran, sunnah_fasting,
      wake_up_early, help_parents, pray_with_parents, give_greetings, smile_greet_polite,
      on_time_arrival, parent_hug_pray, child_tell_parents, quran_juz_info
    ) VALUES (
      ${studentId}, ${habitDate}::date,
      ${vals.fajr}, ${vals.dhuhr}, ${vals.asr}, ${vals.maghrib}, ${vals.isha},
      ${vals.dhuha}, ${vals.tahajud}, ${vals.read_quran}, ${vals.sunnah_fasting},
      ${vals.wake_up_early}, ${vals.help_parents}, ${vals.pray_with_parents},
      ${vals.give_greetings}, ${vals.smile_greet_polite},
      ${otdb}, ${vals.parent_hug_pray}, ${vals.child_tell_parents}, ${qinfo}
    )
    ON CONFLICT (student_id, habit_date) DO UPDATE SET
      fajr = EXCLUDED.fajr,
      dhuhr = EXCLUDED.dhuhr,
      "asr" = EXCLUDED."asr",
      maghrib = EXCLUDED.maghrib,
      isha = EXCLUDED.isha,
      dhuha = EXCLUDED.dhuha,
      tahajud = EXCLUDED.tahajud,
      read_quran = EXCLUDED.read_quran,
      sunnah_fasting = EXCLUDED.sunnah_fasting,
      wake_up_early = EXCLUDED.wake_up_early,
      help_parents = EXCLUDED.help_parents,
      pray_with_parents = EXCLUDED.pray_with_parents,
      give_greetings = EXCLUDED.give_greetings,
      smile_greet_polite = EXCLUDED.smile_greet_polite,
      on_time_arrival = EXCLUDED.on_time_arrival,
      parent_hug_pray = EXCLUDED.parent_hug_pray,
      child_tell_parents = EXCLUDED.child_tell_parents,
      quran_juz_info = EXCLUDED.quran_juz_info,
      updated_at = now()
    RETURNING
      id, student_id, habit_date::text AS habit_date,
      fajr, dhuhr, "asr", maghrib, isha, dhuha, tahajud, read_quran, sunnah_fasting,
      wake_up_early, help_parents, pray_with_parents, give_greetings, smile_greet_polite,
      on_time_arrival, parent_hug_pray, child_tell_parents, quran_juz_info,
      created_at, updated_at
  `;

  if (rows.length === 0) return { ok: false, reason: 'conflict' };
  return { ok: true, row: mapHabitRow(rows[0] as Record<string, unknown>) };
}

export async function getHabitsSummaryRange(
  viewerUserId: number,
  viewerRole: string,
  studentId: number,
  fromDate: string,
  toDate: string,
): Promise<HabitSummaryResponse | null | false> {
  if (!isValidISODate(fromDate) || !isValidISODate(toDate)) return false;
  if (fromDate > toDate) return false;
  const ok = await isStudentVisibleToViewer(viewerUserId, viewerRole, studentId);
  if (!ok) return null;

  const rows = await sql`
    SELECT
      habit_date::text AS habit_date,
      fajr, dhuhr, "asr", maghrib, isha, dhuha, tahajud, read_quran, sunnah_fasting,
      wake_up_early, help_parents, pray_with_parents, give_greetings, smile_greet_polite,
      on_time_arrival, parent_hug_pray, child_tell_parents
    FROM academic_habits
    WHERE student_id = ${studentId}
      AND habit_date >= ${fromDate}::date
      AND habit_date <= ${toDate}::date
    ORDER BY habit_date ASC
  `;

  const mapped = (rows as Record<string, unknown>[]).map((r) => mapHabitRow(r));
  const totalDays = mapped.length;
  if (totalDays === 0) {
    return {
      totalDays: 0,
      avgScorePct: 0,
      ibadahPct: 0,
      disiplinPct: 0,
      karakterPct: 0,
      dailyTrend: [],
      itemRates: HABIT_BOOLEAN_KEYS.map((key) => ({ key, pct: 0 })),
    };
  }

  let scoreSum = 0;
  for (const row of mapped) {
    scoreSum += scorePct(row);
  }
  const avgScorePct = Math.round(scoreSum / totalDays);

  const ibadahPct = categoryAvg(mapped, IBADAH_KEYS, false);
  const disiplinPct = categoryAvg(mapped, DISIPLIN_KEYS, true);
  const karakterPct = categoryAvg(mapped, KARAKTER_KEYS, false);

  const dailyTrend = mapped.map((row) => ({
    date: row.habitDate,
    scorePct: scorePct(row),
  }));

  const itemRates = HABIT_BOOLEAN_KEYS.map((key) => {
    let c = 0;
    for (const row of mapped) {
      if (row[key]) c += 1;
    }
    return { key, pct: Math.round((c / totalDays) * 100) };
  });

  return {
    totalDays,
    avgScorePct,
    ibadahPct,
    disiplinPct,
    karakterPct,
    dailyTrend,
    itemRates,
  };
}
