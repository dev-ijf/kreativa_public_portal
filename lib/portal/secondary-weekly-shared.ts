export type SecondaryWeeklyPayload = {
  akhlaqReflection: string | null;
  bestLearningMoment: string | null;
  mostChallenging: string | null;
  unansweredQuestion: string | null;
  weeklyGoal: string | null;
  messageToHomeroom: string | null;
};

export type SecondaryWeeklyIbadahStats = {
  totalObligatoryPrayers: number;
  maxObligatoryPrayers: number;
  daysWithDhuha: number;
  daysWithTilawah: number;
  daysWithDhikr: number;
  daysInWeek: number;
};

export type SecondaryWeeklyDayRecap = {
  reportDate: string;
  fajrPrayer: boolean;
  dhuhaPrayer: 'yes' | 'no' | null;
  zuhurPrayer: 'well_done' | 'needs_guidance' | 'did_not_pray' | null;
  asrPrayer: boolean;
  maghribPrayer: boolean;
  ishaPrayer: boolean;
  tahajudPrayer: boolean;
  morningDhikr: boolean;
  eveningDhikr: boolean;
  tilawahDone: boolean;
  memorisationDone: boolean;
  energyLevel: number | null;
};

export type SecondaryWeeklyResponse = {
  weekConfigId: number;
  weekLabel: string | null;
  dateFrom: string;
  dateTo: string;
  reflectionId: number | null;
  status: 'draft' | 'submitted' | null;
  payload: SecondaryWeeklyPayload;
  stats: SecondaryWeeklyIbadahStats;
  dailyRecap: SecondaryWeeklyDayRecap[];
  parentIbadahConfirmed: boolean;
  parentIbadahName: string | null;
  parentIbadahConfirmedAt: string | null;
};

export function emptySecondaryWeeklyPayload(): SecondaryWeeklyPayload {
  return {
    akhlaqReflection: null,
    bestLearningMoment: null,
    mostChallenging: null,
    unansweredQuestion: null,
    weeklyGoal: null,
    messageToHomeroom: null,
  };
}
