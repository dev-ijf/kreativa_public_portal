"use client";

import { useMemo, useState } from 'react';
import { BookOpen, Coffee } from 'lucide-react';
import { Header } from '@/components/portal/Header';
import { ChildSelector } from '@/components/portal/ChildSelector';
import { usePortalState, useActiveChild } from '@/components/portal/state/PortalProvider';
import { t } from '@/lib/i18n/translations';
import type { PortalScheduleRow } from '@/lib/data/server/schedules';

const WEEKDAY_LABELS_ID = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'] as const;

const EN_DAY_TO_CANONICAL: Record<string, (typeof WEEKDAY_LABELS_ID)[number]> = {
  monday: 'Senin',
  tuesday: 'Selasa',
  wednesday: 'Rabu',
  thursday: 'Kamis',
  friday: 'Jumat',
  saturday: 'Sabtu',
  sunday: 'Minggu',
};

function canonicalWeekdayLabel(dayRaw: string): string {
  const k = dayRaw.trim().toLowerCase();
  if (EN_DAY_TO_CANONICAL[k]) return EN_DAY_TO_CANONICAL[k];
  for (const lab of WEEKDAY_LABELS_ID) {
    if (lab.toLowerCase() === k) return lab;
  }
  return dayRaw.trim();
}

function indonesianWeekdayToday(): (typeof WEEKDAY_LABELS_ID)[number] {
  const d = new Date();
  const js = d.getDay();
  const idx = js === 0 ? 6 : js - 1;
  return WEEKDAY_LABELS_ID[idx];
}

type Props = {
  initialSchedules: PortalScheduleRow[];
};

export function SchedulesPageClient({ initialSchedules }: Props) {
  const { lang } = usePortalState();
  const activeChild = useActiveChild();
  const [selectedDay, setSelectedDay] = useState<(typeof WEEKDAY_LABELS_ID)[number]>(() =>
    indonesianWeekdayToday(),
  );

  const rowsForChild = useMemo(() => {
    if (!activeChild?.classId || activeChild.academicYearId == null) return [];
    return initialSchedules.filter(
      (r) => r.classId === activeChild.classId && r.academicYearId === activeChild.academicYearId,
    );
  }, [initialSchedules, activeChild]);

  const items = useMemo(() => {
    return rowsForChild.filter((r) => canonicalWeekdayLabel(r.dayOfWeek) === selectedDay);
  }, [rowsForChild, selectedDay]);

  const title = t(lang, 'schedules');
  const pickDay = t(lang, 'schedulePickDay');
  const noClass = t(lang, 'scheduleNoClass');
  const emptyDay = t(lang, 'scheduleEmptyDay');

  return (
    <div className="min-h-screen bg-slate-50 pb-6">
      <Header title={title} backHref="/" />
      <ChildSelector />

      <div className="px-4 space-y-4">
        <div>
          <p className="text-xs font-semibold text-slate-500 mb-2">{pickDay}</p>
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
            {WEEKDAY_LABELS_ID.map((d) => {
              const isOn = d === selectedDay;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedDay(d)}
                  className={[
                    'shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-colors border',
                    isOn
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-primary/40',
                  ].join(' ')}
                >
                  {d.slice(0, 3)}
                </button>
              );
            })}
          </div>
        </div>

        <h3 className="font-bold text-slate-700">{t(lang, 'scheduleDayTitle')}</h3>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 space-y-4">
          {!activeChild ? (
            <div className="text-sm text-slate-500">{noClass}</div>
          ) : activeChild.classId == null || activeChild.academicYearId == null ? (
            <div className="text-sm text-slate-500">{noClass}</div>
          ) : items.length === 0 ? (
            <div className="text-sm text-slate-500">{emptyDay}</div>
          ) : (
            items.map((item, idx) => {
              const timeRange = `${item.startTime} – ${item.endTime}`;
              const subject =
                item.isBreak
                  ? t(lang, 'scheduleBreak')
                  : lang === 'en'
                    ? (item.subjectNameEn ?? '—')
                    : (item.subjectNameId ?? '—');
              const teacher =
                item.isBreak || !item.teacherName?.trim()
                  ? '—'
                  : item.teacherName;

              return (
                <div key={item.id} className="flex relative pl-6">
                  <div className="absolute left-0 top-1 w-2.5 h-2.5 rounded-full bg-primary border-2 border-indigo-200" />
                  {idx !== items.length - 1 ? (
                    <div className="absolute left-[4px] top-3 bottom-[-16px] w-[2px] bg-indigo-100" />
                  ) : null}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-primary font-bold mb-0.5">{timeRange}</p>
                    <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-100 flex justify-between items-center gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-700 text-sm">{subject}</p>
                        <p className="text-xs text-slate-500 truncate">
                          {lang === 'en' ? 'Teacher' : 'Guru'}: {teacher}
                        </p>
                      </div>
                      {item.isBreak ? (
                        <Coffee size={18} className="text-slate-400 shrink-0" />
                      ) : (
                        <BookOpen size={18} className="text-indigo-300 shrink-0" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
