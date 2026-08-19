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

export type PortalDayNote = {
  dayIndex: number;
  uniformLabel: string | null;
  parentPrep: string | null;
};

export type PortalWeeklyPlanBundle = {
  studentId: number;
  schoolId: number;
  classId: number;
  academicYearId: number;
  week: PortalWeekConfig | null;
  defaultDayIndex: number;
  hasPrevWeek: boolean;
  hasNextWeek: boolean;
  plan: {
    id: number;
    schoolLevel: string;
    weeklyTheme: string | null;
  } | null;
  rows: PortalWeeklyPlanRow[];
  dayNotes: PortalDayNote[];
};
