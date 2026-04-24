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

export type PortalHabitDayPayload = Record<HabitBooleanKey, boolean> & {
  onTimeArrival: OnTimeArrivalValue;
  quranJuzInfo: string | null;
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
  };
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
