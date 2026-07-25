import type { PortalWeekConfig } from '@/lib/portal/weekly-plan-types';

export type PortalLmsMaterial = {
  id: number;
  title: string;
  materialType: string;
  fileName: string | null;
  url: string | null;
  mimeType: string | null;
};

export type PortalLmsPrePostBlock = {
  enabled: boolean;
  type: string | null;
  minutes: number | null;
  instructions: string | null;
  url: string | null;
  fileName: string | null;
  filePath: string | null;
};

export type PortalLmsSession = {
  id: number;
  courseId: number;
  subjectName: string;
  title: string;
  learningObjectives: string | null;
  descriptionHtml: string | null;
  sessionDate: string;
  /** Mon–Fri index 0–4 derived from sessionDate vs week.dateFrom; -1 if outside. */
  dayIndex: number;
  startTime: string | null;
  endTime: string | null;
  periodNumber: number | null;
  materials: PortalLmsMaterial[];
  preLearning: PortalLmsPrePostBlock | null;
  postLearning: PortalLmsPrePostBlock | null;
};

export type PortalLmsWeeklyPlanBundle = {
  studentId: number;
  schoolId: number;
  classId: number;
  academicYearId: number;
  week: PortalWeekConfig | null;
  defaultDayIndex: number;
  sessions: PortalLmsSession[];
};
