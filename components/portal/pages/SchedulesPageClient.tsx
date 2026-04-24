"use client";

import { useMemo, useState } from 'react';
import { BookOpen, Coffee } from 'lucide-react';
import { Header } from '@/components/portal/Header';
import { ChildSelector } from '@/components/portal/ChildSelector';
import { usePortalState, useActiveChild } from '@/components/portal/state/PortalProvider';
import { t, type Lang } from '@/lib/i18n/translations';
import type { TranslationKey } from '@/lib/i18n/translations';
import type { PortalScheduleRow } from '@/lib/data/server/schedules';

const WEEKDAY_LABELS_ID = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'] as const;

const WEEKDAY_KEYS: readonly TranslationKey[] = [
  'weekdayMon',
  'weekdayTue',
  'weekdayWed',
  'weekdayThu',
  'weekdayFri',
  'weekdaySat',
  'weekdaySun',
];

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

function weekdayIndexFromCanonical(dayRaw: string): number {
  const canon = canonicalWeekdayLabel(dayRaw);
  const i = (WEEKDAY_LABELS_ID as readonly string[]).indexOf(canon);
  return i >= 0 ? i : 0;
}

function todayWeekdayIndex(): number {
  const d = new Date();
  const js = d.getDay();
  return js === 0 ? 6 : js - 1;
}

type Props = {
  initialSchedules: PortalScheduleRow[];
};

export function SchedulesPageClient({ initialSchedules }: Props) {
  const { lang } = usePortalState();
  const activeChild = useActiveChild();
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(() => todayWeekdayIndex());

  const rowsForChild = useMemo(() => {
    if (!activeChild?.classId || activeChild.academicYearId == null) return [];
    return initialSchedules.filter(
      (r) => r.classId === activeChild.classId && r.academicYearId === activeChild.academicYearId,
    );
  }, [initialSchedules, activeChild]);

  const items = useMemo(() => {
    return rowsForChild.filter((r) => weekdayIndexFromCanonical(r.dayOfWeek) === selectedDayIndex);
  }, [rowsForChild, selectedDayIndex]);

  const title = t(lang, 'schedules');
  const pickDay = t(lang, 'schedulePickDay');
  const noClass = t(lang, 'scheduleNoClass');
  const emptyDay = t(lang, 'scheduleEmptyDay');

  const dayLabel = (idx: number, l: Lang) => t(l, WEEKDAY_KEYS[idx]!);
  const dayLabelShort = (idx: number, l: Lang) => dayLabel(idx, l).slice(0, 3);

  return (
    <div className="min-h-screen bg-slate-50 pb-6">
      <Header title={title} backHref="/" />
      <ChildSelector />

      <div className="px-4 space-y-4">
        <div>
          <p className="text-xs font-semibold text-slate-500 mb-2">{pickDay}</p>
          <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
            {WEEKDAY_KEYS.map((_, idx) => {
              const isOn = idx === selectedDayIndex;
              return (
                <button
                  key={idx}
                  type="button"
                  title={dayLabel(idx, lang)}
                  onClick={() => setSelectedDayIndex(idx)}
                  className={[
                    'rounded-lg px-2.5 py-2 text-xs font-bold transition-colors border shrink-0',
                    isOn
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-primary/40',
                  ].join(' ')}
                >
                  {dayLabelShort(idx, lang)}
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
                          {t(lang, 'scheduleTeacher')}: {teacher}
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
