'use client';

import { useEffect, useMemo, useState } from 'react';
import { Header } from '@/components/portal/Header';
import { ChildSelector } from '@/components/portal/ChildSelector';
import { usePortalState, useActiveChild } from '@/components/portal/state/PortalProvider';
import { t } from '@/lib/i18n/translations';
import type { PortalWeeklyPlanBundle } from '@/lib/portal/weekly-plan-types';
import { isKindergartenStudent } from '@/lib/portal/is-kindergarten';
import { subjectColor } from '@/lib/portal/weekly-plan-colors';
import {
  findKindergartenMainRow,
  slotForDay,
  subjectLessonCount,
} from '@/lib/portal/weekly-plan-utils';
import { DayTabs } from '@/components/portal/schedules/DayTabs';
import { KindergartenWeeklyPlanView } from '@/components/portal/schedules/KindergartenWeeklyPlanView';
import { PrimaryWeeklyPlanView } from '@/components/portal/schedules/PrimaryWeeklyPlanView';

type Props = {
  initialPlans: PortalWeeklyPlanBundle[];
};

export function SchedulesPageClient({ initialPlans }: Props) {
  const { lang } = usePortalState();
  const activeChild = useActiveChild();

  const bundle = useMemo(() => {
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

  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  useEffect(() => {
    setSelectedDayIndex(bundle?.defaultDayIndex ?? 0);
  }, [bundle?.studentId, bundle?.week?.id, bundle?.defaultDayIndex]);

  const isKg = isKindergartenStudent(activeChild ?? {});
  const title = t(lang, 'schedules');
  const weekLabel =
    bundle?.week?.weekLabel?.trim() ||
    (bundle?.week
      ? `${t(lang, 'scheduleWeekPrefix')} ${bundle.week.weekNumber}`
      : null);

  return (
    <div className="min-h-screen bg-[#F4F7F2] pb-6">
      <Header title={title} backHref="/" />
      <ChildSelector />

      <div className="px-4 space-y-4">
        {weekLabel ? (
          <p className="text-xs font-semibold text-slate-500 -mt-1">{weekLabel}</p>
        ) : null}

        {!activeChild ? (
          <p className="text-sm text-slate-500">{t(lang, 'scheduleNoClass')}</p>
        ) : activeChild.classId == null || activeChild.academicYearId == null ? (
          <p className="text-sm text-slate-500">{t(lang, 'scheduleNoClass')}</p>
        ) : !bundle?.week ? (
          <p className="text-sm text-slate-500">{t(lang, 'scheduleNoWeek')}</p>
        ) : !bundle.plan ? (
          <p className="text-sm text-slate-500">{t(lang, 'scheduleNoPlan')}</p>
        ) : (
          <>
            <DayTabs
              lang={lang}
              dateFrom={bundle.week.dateFrom}
              selectedDayIndex={selectedDayIndex}
              onSelect={setSelectedDayIndex}
              metaForDay={(dayIndex) => {
                if (isKg) {
                  const main = findKindergartenMainRow(bundle.rows, dayIndex);
                  const slot = main ? slotForDay(main, dayIndex) : null;
                  const name =
                    slot?.subjectName || main?.category || main?.subjectName || null;
                  return { kind: 'dot', color: subjectColor(name).fg };
                }
                return {
                  kind: 'count',
                  count: subjectLessonCount(bundle.rows, dayIndex),
                };
              }}
            />

            {isKg ? (
              <KindergartenWeeklyPlanView
                lang={lang}
                rows={bundle.rows}
                dayIndex={selectedDayIndex}
              />
            ) : (
              <PrimaryWeeklyPlanView
                lang={lang}
                rows={bundle.rows}
                dayIndex={selectedDayIndex}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
