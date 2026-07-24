import type {
  PortalWeeklyPlanRow,
  PortalWeeklyPlanSlot,
} from '@/lib/portal/weekly-plan-types';

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri'] as const;

/** Calendar YYYY-MM-DD in Asia/Jakarta (school timezone). */
export function todayISODate(now = new Date()): string {
  const shifted = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const d = String(shifted.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Default Mon–Fri day index (0–4) for the resolved week.
 * - Today inside week → today's weekday (weekend → Friday)
 * - Upcoming week → Monday
 * - Past week → Friday
 */
export function computeDefaultDayIndex(
  dateFrom: string,
  dateTo: string,
  now = new Date(),
): number {
  const today = todayISODate(now);
  if (today >= dateFrom && today <= dateTo) {
    // Weekday in Asia/Jakarta (UTC+7)
    const jakarta = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const js = jakarta.getUTCDay(); // 0=Sun … 6=Sat
    const monBased = js === 0 ? 6 : js - 1;
    return monBased >= 5 ? 4 : monBased;
  }
  if (today < dateFrom) return 0;
  return 4;
}

export function isRowActiveOnDay(row: PortalWeeklyPlanRow, dayIndex: number): boolean {
  const key = DAY_KEYS[dayIndex];
  if (!key) return false;
  const days = row.activeDays
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
  if (days.length === 0) return true;
  return days.includes(key);
}

export function slotForDay(
  row: PortalWeeklyPlanRow,
  dayIndex: number,
): PortalWeeklyPlanSlot | null {
  return row.slots.find((s) => s.dayIndex === dayIndex) ?? null;
}

export function formatTimeRange(start: string, end: string): string {
  return `${start} – ${end}`;
}

/**
 * Add days to a YYYY-MM-DD civil date using UTC calendar math
 * (avoids local/DST timezone shifting the day number).
 */
export function addDaysISO(dateFrom: string, dayIndex: number): string {
  const [y, m, d] = dateFrom.split('-').map(Number);
  if (!y || !m || !d) return dateFrom;
  const dt = new Date(Date.UTC(y, m - 1, d + dayIndex));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/** Calendar day number (1–31) for Mon–Fri tab from week date_from. */
export function dayNumberFromWeekStart(dateFrom: string, dayIndex: number): number {
  const iso = addDaysISO(dateFrom, dayIndex);
  const day = Number(iso.slice(8, 10));
  return Number.isFinite(day) ? day : dayIndex + 1;
}

/**
 * KG "Aktivitas Utama": prefer instructional row named/categorized as main activity,
 * else the last instructional row with a topic slot for that day.
 */
export function findKindergartenMainRow(
  rows: PortalWeeklyPlanRow[],
  dayIndex: number,
): PortalWeeklyPlanRow | null {
  const instructional = rows.filter(
    (r) =>
      r.rowType === 'instructional' &&
      isRowActiveOnDay(r, dayIndex) &&
      slotForDay(r, dayIndex)?.topic,
  );
  if (instructional.length === 0) return null;

  const byName = instructional.find((r) => {
    const label = `${r.subjectName ?? ''} ${r.category ?? ''}`.toLowerCase();
    return label.includes('aktivitas utama') || label.includes('main activity');
  });
  if (byName) return byName;

  // Prefer non-"Rutin" category instructional (e.g. Math / STEM main block)
  const nonRoutine = instructional.find((r) => {
    const cat = (r.category ?? '').toLowerCase();
    return cat && cat !== 'rutin' && cat !== 'routine';
  });
  return nonRoutine ?? instructional[instructional.length - 1] ?? null;
}

export function periodsForDay(
  rows: PortalWeeklyPlanRow[],
  dayIndex: number,
): Array<{
  row: PortalWeeklyPlanRow;
  slot: PortalWeeklyPlanSlot | null;
}> {
  return rows
    .filter((r) => isRowActiveOnDay(r, dayIndex))
    .map((row) => ({ row, slot: slotForDay(row, dayIndex) }))
    .sort((a, b) => {
      if (a.row.sortOrder !== b.row.sortOrder) return a.row.sortOrder - b.row.sortOrder;
      return a.row.timeStart.localeCompare(b.row.timeStart);
    });
}

export function subjectLessonCount(
  rows: PortalWeeklyPlanRow[],
  dayIndex: number,
): number {
  return periodsForDay(rows, dayIndex).filter(({ row, slot }) => {
    if (row.rowType !== 'instructional') return false;
    const subject = slot?.subjectName || row.subjectName || row.category;
    const cat = (row.category ?? '').toLowerCase();
    if (cat === 'rutin' || cat === 'routine') return false;
    return Boolean(subject || slot?.topic);
  }).length;
}
