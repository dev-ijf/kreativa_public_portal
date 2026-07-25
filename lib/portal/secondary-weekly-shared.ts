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
  isOnPeriod: boolean;
};

export type SecondaryWeeklySubjectCard = {
  sessionId: number;
  reportDate: string;
  subjectName: string;
  title: string;
  understanding: 'fully' | 'mostly' | 'partially' | 'need_help' | null;
  effort: 'maximum' | 'good' | 'could_do_more' | 'needs_improvement' | null;
  quickNote: string | null;
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
  weekSubjects: SecondaryWeeklySubjectCard[];
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
