import type { TranslationKey } from '@/lib/i18n/translations';

export type DailyReportSchoolLevel = 'kindergarten' | 'primary';

export type ClassReportMedia = {
  id: number;
  mediaType: 'image' | 'video_file' | 'video_link';
  url: string;
  thumbnailUrl: string | null;
  caption: string | null;
  sortOrder: number;
};

export type ClassReportInfo = {
  id: number;
  theme: string | null;
  teacherNote: string | null;
  media: ClassReportMedia[];
};

export type DailyReportCalendarDay = {
  date: string;
  hasReport: boolean;
  parentReadConfirmed: boolean;
};

export type DailyReportCalendarMonthResponse = {
  days: DailyReportCalendarDay[];
  /** Latest report day in the month, else today (for single day fetch on mount). */
  suggestedDate: string;
};

export type DailyReportMessage = {
  id: number;
  authorRole: 'parent' | 'staff';
  body: string;
  createdAt: string | null;
};

/** Slim parent-corner PATCH result — avoid rebuilding full DailyReportFull. */
export type DailyReportParentPatch = {
  parentMessage: string | null;
  parentReadConfirmed: boolean;
  parentReadAt: string | null;
  sleepTime: string | null;
  wakeTime: string | null;
  readingTogether: boolean;
  status: 'submitted' | 'read';
  messages?: DailyReportMessage[];
};

export type DailyReportCharacter = {
  name: string;
  nameId: string | null;
  selected: boolean;
};

export type DailyReportPlayCentre = {
  name: string;
  nameId: string | null;
  selected: boolean;
};

export type DailyReportLearningArea = {
  name: string;
  nameId: string | null;
  selected: boolean;
  rating: number | null;
};

export type DailyReportVocabulary = {
  word: string;
  meaning: string;
};

export type DailyReportTilawah = {
  method: 'quran' | 'iqra' | 'ummi' | 'tilawati';
  jilid: number | null;
  page: number | null;
  rating: number | null;
  ratingLabel: string | null;
};

export type DailyReportMemorize = {
  surahName: string;
  verseNote: string | null;
  rating: number | null;
  ratingLabel: string | null;
};

export type DailyReportSubject = {
  subjectName: string;
  subjectNameId: string | null;
  learningAreaId: number | null;
  topic: string | null;
  activities: string | null;
  teacherNote: string | null;
  noteToParents: string | null;
  dailyScore: number | null;
  scoreLabel: string | null;
  homeworkGiven: boolean;
  homework: string | null;
  homeworkDueDate: string | null;
  atlSkills: string[];
  characters: string[];
  privateNote: string | null;
};

export type DailyReportHomeworkItem = {
  subjectName: string;
  subjectNameId: string | null;
  homework: string;
  homeworkDueDate: string;
  assignedDate: string;
};

export type DailyReportSubjectOption = {
  learningAreaId: number;
  name: string;
  nameId: string | null;
};

export type DailyReportSubjectHistoryItem = {
  reportDate: string;
  topic: string | null;
  activities: string | null;
  homeworkGiven: boolean;
  homework: string | null;
  homeworkDueDate: string | null;
  atlSkills: string[];
  characters: string[];
  privateNote: string | null;
  noteToParents: string | null;
};

export type DailyReportObserveOption = {
  name: string;
  nameId: string | null;
  selected: boolean;
};

export type DailyReportObserveDomain = {
  name: string;
  nameId: string | null;
  options: DailyReportObserveOption[];
};

export type DailyReportHomeTip = {
  name: string;
  nameId: string | null;
};

export type DailyReportStudentMedia = {
  id: number;
  mediaType: 'image' | 'video_file' | 'video_link' | 'document';
  url: string;
  thumbnailUrl: string | null;
  caption: string | null;
  sortOrder: number;
};

export type DailyReportFull = {
  id: number;
  studentName: string;
  className: string;
  reportDate: string;
  schoolLevel: DailyReportSchoolLevel;
  focusPrayer: string | null;
  focusPrayerRating: number | null;
  dhuhaPrayer: 'yes' | 'no' | null;
  zuhurPrayer: 'well_done' | 'needs_guidance' | 'did_not_pray' | null;
  surahMemorised: string | null;
  asmaulHusna: string | null;
  playCentre: string | null;
  playCentreHighlights: string | null;
  lunchStatus: 'finished' | 'half' | 'refused' | null;
  waterIntake: 'good' | 'not_enough' | null;
  healthNote: string | null;
  mood: 'very_happy' | 'happy' | 'neutral' | 'sad' | 'fussy' | null;
  /** KG parent routine (HH:MM) */
  sleepTime: string | null;
  wakeTime: string | null;
  readingTogether: boolean;
  shineMoment: string | null;
  teacherNarrative: string | null;
  homeGuidance: string | null;
  teacherHighlight: string | null;
  teacherFollowup: string | null;
  parentMessage: string | null;
  /** Chronological parent ↔ staff thread (append-only). */
  messages: DailyReportMessage[];
  parentReadConfirmed: boolean;
  parentReadAt: string | null;
  status: 'submitted' | 'read';
  teacherNames: string[];
  characters: DailyReportCharacter[];
  playCentres: DailyReportPlayCentre[];
  learningAreas: DailyReportLearningArea[];
  vocabulary: DailyReportVocabulary[];
  subjects: DailyReportSubject[];
  observeDomains: DailyReportObserveDomain[];
  homeTips: DailyReportHomeTip[];
  studentMedia: DailyReportStudentMedia[];
  classReport: ClassReportInfo | null;
  tilawah: DailyReportTilawah | null;
  memorize: DailyReportMemorize[];
};

export type DailyReportSummaryLearningArea = {
  name: string;
  nameId: string | null;
  avgRating: number;
  totalObservations: number;
};

export type DailyReportSummaryMood = {
  mood: string;
  count: number;
};

export type DailyReportSummaryResponse = {
  daysReported: number;
  daysReadByParent: number;
  readRatePct: number;
  learningAreas: DailyReportSummaryLearningArea[];
  moods: DailyReportSummaryMood[];
};

export const DHUHA_KEYS: Record<'yes' | 'no', TranslationKey> = {
  yes: 'drDhuhaYes',
  no: 'drDhuhaNo',
};

export const ZUHUR_KEYS: Record<
  'well_done' | 'needs_guidance' | 'did_not_pray',
  TranslationKey
> = {
  well_done: 'drZuhurWellDone',
  needs_guidance: 'drZuhurNeedsGuidance',
  did_not_pray: 'drZuhurDidNotPray',
};

export const LUNCH_KEYS: Record<'finished' | 'half' | 'refused', TranslationKey> = {
  finished: 'drLunchFinished',
  half: 'drLunchHalf',
  refused: 'drLunchRefused',
};

export const WATER_KEYS: Record<'good' | 'not_enough', TranslationKey> = {
  good: 'drWaterGood',
  not_enough: 'drWaterNotEnough',
};

export const MOOD_KEYS: Record<
  'very_happy' | 'happy' | 'neutral' | 'sad' | 'fussy',
  TranslationKey
> = {
  very_happy: 'drMoodVeryHappy',
  happy: 'drMoodHappy',
  neutral: 'drMoodNeutral',
  sad: 'drMoodSad',
  fussy: 'drMoodFussy',
};

export const MOOD_EMOJI: Record<
  'very_happy' | 'happy' | 'neutral' | 'sad' | 'fussy',
  string
> = {
  very_happy: '🤩',
  happy: '😊',
  neutral: '😐',
  sad: '😢',
  fussy: '😤',
};
