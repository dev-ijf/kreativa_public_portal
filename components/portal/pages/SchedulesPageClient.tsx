'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Header } from '@/components/portal/Header';
import { ChildSelector } from '@/components/portal/ChildSelector';
import { usePortalState, useActiveChild } from '@/components/portal/state/PortalProvider';
import { t } from '@/lib/i18n/translations';
import type { PortalWeeklyPlanBundle } from '@/lib/portal/weekly-plan-types';
import type { PortalLmsWeeklyPlanBundle } from '@/lib/portal/lms-weekly-plan-types';
import {
  isKindergartenStudent,
  isPrimaryStudent,
  isSecondaryOrHighSchoolStudent,
} from '@/lib/portal/is-kindergarten';
import { subjectColor } from '@/lib/portal/weekly-plan-colors';
import {
  findKindergartenMainRow,
  slotForDay,
  subjectLessonCount,
} from '@/lib/portal/weekly-plan-utils';
import { DayTabs } from '@/components/portal/schedules/DayTabs';
import { KindergartenWeeklyPlanView } from '@/components/portal/schedules/KindergartenWeeklyPlanView';
import { PrimaryWeeklyPlanView } from '@/components/portal/schedules/PrimaryWeeklyPlanView';
import { SecondaryWeeklyPlanView } from '@/components/portal/schedules/SecondaryWeeklyPlanView';

type Props = {
  initialPlans: PortalWeeklyPlanBundle[];
  initialLmsPlans: PortalLmsWeeklyPlanBundle[];
};

export function SchedulesPageClient({ initialPlans, initialLmsPlans }: Props) {
  const { lang } = usePortalState();
  const activeChild = useActiveChild();

  const isKg = isKindergartenStudent(activeChild ?? {});
  const isPrimary = isPrimaryStudent(activeChild ?? {});
  const isSecondary = isSecondaryOrHighSchoolStudent(activeChild ?? {});

  const wlBundle = useMemo(() => {
    if (!activeChild?.classId || activeChild.academicYearId == null) return null;
    return (
      initialPlans.find(
        (p) =>
          p.studentId === activeChild.id &&
          p.classId === activeChild.classId &&
          p.academicYearId === activeChild.academicYearId,
      ) ?? null
    );
  }, [initialPlans, activeChild]);

  const lmsBundle = useMemo(() => {
    if (!activeChild?.classId || activeChild.academicYearId == null) return null;
    return (
      initialLmsPlans.find(
        (p) =>
          p.studentId === activeChild.id &&
          p.classId === activeChild.classId &&
          p.academicYearId === activeChild.academicYearId,
      ) ?? null
    );
  }, [initialLmsPlans, activeChild]);

  const week = isSecondary ? lmsBundle?.week ?? null : wlBundle?.week ?? null;
  const defaultDayIndex = isSecondary
    ? (lmsBundle?.defaultDayIndex ?? 0)
    : (wlBundle?.defaultDayIndex ?? 0);

  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  useEffect(() => {
    setSelectedDayIndex(defaultDayIndex);
  }, [
    activeChild?.id,
    week?.id,
    defaultDayIndex,
  ]);

  const title = t(lang, 'schedules');
  const weekLabel =
    week?.weekLabel?.trim() ||
    (week ? `${t(lang, 'scheduleWeekPrefix')} ${week.weekNumber}` : null);

  const hasNoClass =
    !activeChild ||
    activeChild.classId == null ||
    activeChild.academicYearId == null;

  let body: ReactNode;
  if (hasNoClass) {
    body = <p className="text-sm text-slate-500">{t(lang, 'scheduleNoClass')}</p>;
  } else if (!week) {
    body = <p className="text-sm text-slate-500">{t(lang, 'scheduleNoWeek')}</p>;
  } else if (isSecondary) {
    const hasSessions = (lmsBundle?.sessions.length ?? 0) > 0;
    body = !hasSessions ? (
      <p className="text-sm text-slate-500">{t(lang, 'scheduleNoPlan')}</p>
    ) : (
      <>
        <DayTabs
          lang={lang}
          dateFrom={week.dateFrom}
          selectedDayIndex={selectedDayIndex}
          onSelect={setSelectedDayIndex}
          metaForDay={(dayIndex) => ({
            kind: 'count',
            count: (lmsBundle?.sessions ?? []).filter((s) => s.dayIndex === dayIndex)
              .length,
          })}
        />
        <SecondaryWeeklyPlanView
          lang={lang}
          sessions={lmsBundle?.sessions ?? []}
          dayIndex={selectedDayIndex}
        />
      </>
    );
  } else if (!wlBundle?.plan) {
    body = <p className="text-sm text-slate-500">{t(lang, 'scheduleNoPlan')}</p>;
  } else {
    body = (
      <>
        <DayTabs
          lang={lang}
          dateFrom={week.dateFrom}
          selectedDayIndex={selectedDayIndex}
          onSelect={setSelectedDayIndex}
          metaForDay={(dayIndex) => {
            if (isKg) {
              const main = findKindergartenMainRow(wlBundle.rows, dayIndex);
              const slot = main ? slotForDay(main, dayIndex) : null;
              const name =
                slot?.subjectName || main?.category || main?.subjectName || null;
              return { kind: 'dot', color: subjectColor(name).fg };
            }
            return {
              kind: 'count',
              count: subjectLessonCount(wlBundle.rows, dayIndex),
            };
          }}
        />
        {isKg ? (
          <KindergartenWeeklyPlanView
            lang={lang}
            rows={wlBundle.rows}
            dayIndex={selectedDayIndex}
          />
        ) : isPrimary ? (
          <PrimaryWeeklyPlanView
            lang={lang}
            rows={wlBundle.rows}
            dayIndex={selectedDayIndex}
          />
        ) : (
          <PrimaryWeeklyPlanView
            lang={lang}
            rows={wlBundle.rows}
            dayIndex={selectedDayIndex}
          />
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F7F2] pb-6">
      <Header title={title} backHref="/" />
      <ChildSelector />

      <div className="px-4 space-y-4">
        {weekLabel ? (
          <p className="text-xs font-semibold text-slate-500 -mt-1">{weekLabel}</p>
        ) : null}
        {body}
      </div>
    </div>
  );
}
