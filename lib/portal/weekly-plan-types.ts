export type PortalWeekConfig = {
  id: number;
  weekNumber: number;
  weekLabel: string | null;
  dateFrom: string;
  dateTo: string;
};

export type PortalWeeklyPlanSlot = {
  dayIndex: number;
  topic: string | null;
  description: string | null;
  subjectName: string | null;
};

export type PortalWeeklyPlanRow = {
  id: number;
  rowType: 'routine' | 'instructional';
  timeStart: string;
  timeEnd: string;
  routineDescription: string | null;
  subjectName: string | null;
  category: string | null;
  sortOrder: number;
  activeDays: string;
  slots: PortalWeeklyPlanSlot[];
};

export type PortalWeeklyPlanBundle = {
  studentId: number;
  schoolId: number;
  classId: number;
  academicYearId: number;
  week: PortalWeekConfig | null;
  defaultDayIndex: number;
  plan: {
    id: number;
    schoolLevel: string;
    weeklyTheme: string | null;
  } | null;
  rows: PortalWeeklyPlanRow[];
};
