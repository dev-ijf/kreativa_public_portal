export const GOOD_DEED_TYPES = [
  'helped_friend',
  'kept_clean',
  'spoke_truth',
  'showed_respect',
  'avoided_backbiting',
  'other',
] as const;

export type GoodDeedType = (typeof GOOD_DEED_TYPES)[number];

export type UnderstandingLevel = 'fully' | 'mostly' | 'partially' | 'need_help';
export type EffortLevel = 'maximum' | 'good' | 'could_do_more' | 'needs_improvement';
export type DhuhaPrayer = 'yes' | 'no';
export type ZuhurPrayer = 'well_done' | 'needs_guidance' | 'did_not_pray';

export type SecondaryGoodDeed = {
  deedType: GoodDeedType;
  customDeed: string | null;
};

export type SecondarySessionCard = {
  sessionId: number;
  title: string;
  subjectName: string;
  periodNumber: number | null;
  startTime: string | null;
  endTime: string | null;
  attendanceStatus: string | null;
  understanding: UnderstandingLevel | null;
  effort: EffortLevel | null;
  quickNote: string | null;
};

export type SecondaryDailyPayload = {
  fajrPrayer: boolean;
  asrPrayer: boolean;
  maghribPrayer: boolean;
  ishaPrayer: boolean;
  tahajudPrayer: boolean;
  morningDhikr: boolean;
  eveningDhikr: boolean;
  tilawahDone: boolean;
  memorisationDone: boolean;
  dhuhaPrayer: DhuhaPrayer | null;
  zuhurPrayer: ZuhurPrayer | null;
  energyLevel: number | null;
  goodDeeds: SecondaryGoodDeed[];
  sessionReflections: {
    sessionId: number;
    subjectName: string;
    understanding: UnderstandingLevel | null;
    effort: EffortLevel | null;
    quickNote: string | null;
  }[];
};

export type SecondaryDailyDayResponse = {
  reportId: number | null;
  reportDate: string;
  status: 'draft' | 'submitted' | 'read' | null;
  payload: SecondaryDailyPayload;
  sessions: SecondarySessionCard[];
};

export type SecondaryDailyCalendarDay = {
  date: string;
  hasEntry: boolean;
  scorePct: number;
};

export type SecondaryDailySummaryResponse = {
  totalDays: number;
  avgScorePct: number;
  prayerPct: number;
  avgEnergy: number | null;
  goodDeedCount: number;
  sessionReflectionPct: number;
  dailyTrend: { date: string; scorePct: number }[];
};

export function emptySecondaryDailyPayload(): SecondaryDailyPayload {
  return {
    fajrPrayer: false,
    asrPrayer: false,
    maghribPrayer: false,
    ishaPrayer: false,
    tahajudPrayer: false,
    morningDhikr: false,
    eveningDhikr: false,
    tilawahDone: false,
    memorisationDone: false,
    dhuhaPrayer: null,
    zuhurPrayer: null,
    energyLevel: null,
    goodDeeds: [],
    sessionReflections: [],
  };
}

export function secondaryDailyScorePct(p: SecondaryDailyPayload): number {
  let done = 0;
  let total = 0;

  const bools: (keyof SecondaryDailyPayload)[] = [
    'fajrPrayer',
    'asrPrayer',
    'maghribPrayer',
    'ishaPrayer',
    'tahajudPrayer',
    'morningDhikr',
    'eveningDhikr',
    'tilawahDone',
    'memorisationDone',
  ];
  for (const k of bools) {
    total += 1;
    if (p[k] === true) done += 1;
  }
  total += 1;
  if (p.dhuhaPrayer === 'yes') done += 1;
  total += 1;
  if (p.zuhurPrayer === 'well_done' || p.zuhurPrayer === 'needs_guidance') done += 1;
  total += 1;
  if (p.energyLevel != null && p.energyLevel >= 1) done += 1;
  total += 1;
  if (p.goodDeeds.length > 0) done += 1;

  if (p.sessionReflections.length > 0) {
    for (const s of p.sessionReflections) {
      total += 1;
      if (s.understanding && s.effort) done += 1;
    }
  }

  if (total === 0) return 0;
  return Math.round((done / total) * 100);
}
