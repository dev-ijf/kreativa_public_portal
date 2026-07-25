export const HABIT_BOOLEAN_KEYS = [
  'fajr',
  'dhuhr',
  'asr',
  'maghrib',
  'isha',
  'dhuha',
  'tahajud',
  'read_quran',
  'sunnah_fasting',
  'wake_up_early',
  'help_parents',
  'pray_with_parents',
  'give_greetings',
  'smile_greet_polite',
  'parent_hug_pray',
  'child_tell_parents',
] as const;

export type HabitBooleanKey = (typeof HABIT_BOOLEAN_KEYS)[number];

/** Matches school form: on time, late, or excused (izin / sakit / libur). */
export type OnTimeArrivalValue = 'on_time' | 'late' | 'permission' | 'sick' | 'holiday' | null;

/** Ibadah keys excused from score when isOnPeriod (prayers / related ibadah). */
export const HABIT_PERIOD_EXCUSED_KEYS: readonly HabitBooleanKey[] = [
  'fajr',
  'dhuhr',
  'asr',
  'maghrib',
  'isha',
  'dhuha',
  'tahajud',
  'sunnah_fasting',
  'pray_with_parents',
];

export type PortalHabitDayPayload = Record<HabitBooleanKey, boolean> & {
  onTimeArrival: OnTimeArrivalValue;
  quranJuzInfo: string | null;
  /** When true (female students), prayer/ibadah keys are excused from score. */
  isOnPeriod: boolean;
};

export function emptyHabitPayload(): PortalHabitDayPayload {
  const b = {} as Record<HabitBooleanKey, boolean>;
  for (const k of HABIT_BOOLEAN_KEYS) {
    b[k] = false;
  }
  return {
    ...b,
    onTimeArrival: null,
    quranJuzInfo: null,
    isOnPeriod: false,
  };
}

export function habitScoreParts(p: PortalHabitDayPayload): { done: number; total: number } {
  let done = 0;
  let total = 0;
  for (const k of HABIT_BOOLEAN_KEYS) {
    if (p.isOnPeriod && HABIT_PERIOD_EXCUSED_KEYS.includes(k)) continue;
    total += 1;
    if (p[k]) done += 1;
  }
  return { done, total };
}

export function habitScorePct(p: PortalHabitDayPayload): number {
  const { done, total } = habitScoreParts(p);
  if (total === 0) return 0;
  return Math.round((done / total) * 100);
}

export type HabitCalendarDay = {
  date: string;
  hasEntry: boolean;
  scorePct: number;
};

export type HabitSummaryResponse = {
  totalDays: number;
  avgScorePct: number;
  ibadahPct: number;
  disiplinPct: number;
  karakterPct: number;
  dailyTrend: { date: string; scorePct: number }[];
  itemRates: { key: HabitBooleanKey; pct: number }[];
};
