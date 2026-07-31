'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
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

function upsertByStudent<T extends { studentId: number }>(list: T[], next: T): T[] {
  const idx = list.findIndex((p) => p.studentId === next.studentId);
  if (idx < 0) return [...list, next];
  const copy = list.slice();
  copy[idx] = next;
  return copy;
}

export function SchedulesPageClient({ initialPlans, initialLmsPlans }: Props) {
  const { lang } = usePortalState();
  const activeChild = useActiveChild();

  const [wlPlans, setWlPlans] = useState(initialPlans);
  const [lmsPlans, setLmsPlans] = useState(initialLmsPlans);
  const [loadingWeek, setLoadingWeek] = useState(false);

  useEffect(() => {
    setWlPlans(initialPlans);
    setLmsPlans(initialLmsPlans);
  }, [initialPlans, initialLmsPlans]);

  const isKg = isKindergartenStudent(activeChild ?? {});
  const isPrimary = isPrimaryStudent(activeChild ?? {});
  const isSecondary = isSecondaryOrHighSchoolStudent(activeChild ?? {});

  const wlBundle = useMemo(() => {
    if (!activeChild?.classId || activeChild.academicYearId == null) return null;
    return (
      wlPlans.find(
        (p) =>
          p.studentId === activeChild.id &&
          p.classId === activeChild.classId &&
          p.academicYearId === activeChild.academicYearId,
      ) ?? null
    );
  }, [wlPlans, activeChild]);

  const lmsBundle = useMemo(() => {
    if (!activeChild?.classId || activeChild.academicYearId == null) return null;
    return (
      lmsPlans.find(
        (p) =>
          p.studentId === activeChild.id &&
          p.classId === activeChild.classId &&
          p.academicYearId === activeChild.academicYearId,
      ) ?? null
    );
  }, [lmsPlans, activeChild]);

  const week = isSecondary ? lmsBundle?.week ?? null : wlBundle?.week ?? null;
  const hasPrevWeek = isSecondary
    ? (lmsBundle?.hasPrevWeek ?? false)
    : (wlBundle?.hasPrevWeek ?? false);
  const hasNextWeek = isSecondary
    ? (lmsBundle?.hasNextWeek ?? false)
    : (wlBundle?.hasNextWeek ?? false);
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

  const shiftWeek = async (direction: 'prev' | 'next') => {
    if (!activeChild || !week || loadingWeek) return;
    if (direction === 'prev' && !hasPrevWeek) return;
    if (direction === 'next' && !hasNextWeek) return;

    setLoadingWeek(true);
    try {
      const params = new URLSearchParams({
        studentId: String(activeChild.id),
        weekConfigId: String(week.id),
        direction,
      });
      const res = await fetch(`/api/portal/schedules/week?${params.toString()}`);
      if (!res.ok) return;
      const data = (await res.json()) as
        | { source: 'wl'; bundle: PortalWeeklyPlanBundle }
        | { source: 'lms'; bundle: PortalLmsWeeklyPlanBundle };

      if (data.source === 'lms') {
        setLmsPlans((prev) => upsertByStudent(prev, data.bundle));
      } else {
        setWlPlans((prev) => upsertByStudent(prev, data.bundle));
      }
    } finally {
      setLoadingWeek(false);
    }
  };

  const hasNoClass =
    !activeChild ||
    activeChild.classId == null ||
    activeChild.academicYearId == null;

  let body: ReactNode;
  if (hasNoClass) {
    body = <p className="text-sm text-slate-500">{t(lang, 'scheduleNoClass')}</p>;
  } else if (!week) {
    body = <p className="text-sm text-slate-500">{t(lang, 'scheduleNoWeek')}</p>;
  } else if (loadingWeek) {
    body = (
      <div className="flex justify-center py-16" aria-busy="true" aria-live="polite">
        <Loader2 size={28} className="animate-spin text-slate-400" />
      </div>
    );
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
          <div className="flex items-center justify-between gap-2 -mt-1">
            <button
              type="button"
              onClick={() => void shiftWeek('prev')}
              disabled={!hasPrevWeek || loadingWeek}
              aria-label={t(lang, 'schedulePrevWeek')}
              className="p-1.5 rounded-full text-slate-600 hover:bg-white/80 disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronLeft size={18} strokeWidth={2.25} />
            </button>
            <p className="text-xs font-semibold text-slate-500 text-center flex-1 min-w-0 truncate">
              {weekLabel}
            </p>
            <button
              type="button"
              onClick={() => void shiftWeek('next')}
              disabled={!hasNextWeek || loadingWeek}
              aria-label={t(lang, 'scheduleNextWeek')}
              className="p-1.5 rounded-full text-slate-600 hover:bg-white/80 disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronRight size={18} strokeWidth={2.25} />
            </button>
          </div>
        ) : null}
        {body}
      </div>
    </div>
  );
}
