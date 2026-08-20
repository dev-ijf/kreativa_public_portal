'use client';

import { CalendarOff } from 'lucide-react';
import type { Lang } from '@/lib/i18n/translations';
import { t, type TranslationKey } from '@/lib/i18n/translations';
import type { PortalWeeklyPlanRow, PortalDayNote } from '@/lib/portal/weekly-plan-types';
import { subjectColor } from '@/lib/portal/weekly-plan-colors';
import {
  findDayOffForDay,
  findKindergartenMainRow,
  formatTimeRange,
  periodsForDay,
  slotForDay,
} from '@/lib/portal/weekly-plan-utils';
import { DayParentPrepCard } from '@/components/portal/schedules/DayParentPrepCard';

const WEEKDAY_KEYS: readonly TranslationKey[] = [
  'weekdayMon',
  'weekdayTue',
  'weekdayWed',
  'weekdayThu',
  'weekdayFri',
];

type Props = {
  lang: Lang;
  rows: PortalWeeklyPlanRow[];
  dayIndex: number;
  dayNote?: PortalDayNote | null;
};

export function KindergartenWeeklyPlanView({ lang, rows, dayIndex, dayNote }: Props) {
  const dayOff = findDayOffForDay(rows, dayIndex);
  const dayName = t(lang, WEEKDAY_KEYS[dayIndex] ?? 'weekdayMon');

  if (dayOff) {
    return (
      <div className="space-y-5">
        <DayParentPrepCard lang={lang} note={dayNote} />
        <div className="rounded-[20px] border-2 border-rose-200 bg-rose-50 p-5 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-800">
            <CalendarOff size={14} />
            {dayOff.category?.trim() || t(lang, 'scheduleDayOffBadge')}
          </span>
          <h2 className="mt-3 mb-0 text-lg font-bold text-rose-950 leading-snug">
            {dayOff.label}
          </h2>
          <p className="mt-2 mb-0 text-[13px] text-rose-900/80 leading-relaxed">
            {t(lang, 'scheduleDayOffTitle')}
          </p>
          <p className="mt-1.5 mb-0 text-xs text-rose-800/70">
            {t(lang, 'scheduleDayOffHint')} · {dayName}
          </p>
        </div>
      </div>
    );
  }

  const mainRow = findKindergartenMainRow(rows, dayIndex);
  const mainSlot = mainRow ? slotForDay(mainRow, dayIndex) : null;
  const badge =
    mainSlot?.subjectName || mainRow?.category || mainRow?.subjectName || '—';
  const colors = subjectColor(badge);
  const title = mainSlot?.topic?.trim() || t(lang, 'scheduleEmptyDay');
  const desc = mainSlot?.description?.trim() || null;
  const timeLabel = mainRow
    ? formatTimeRange(mainRow.timeStart, mainRow.timeEnd)
    : null;

  const periods = periodsForDay(rows, dayIndex);

  return (
    <div className="space-y-5">
      <DayParentPrepCard lang={lang} note={dayNote} />

      {mainRow && mainSlot?.topic ? (
        <div className="rounded-[20px] border border-slate-200 bg-white p-[18px]">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
            style={{ background: colors.bg, color: colors.fg }}
          >
            {badge}
          </span>
          <div
            className="mt-3 mb-3 flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: colors.bg, color: colors.fg }}
            aria-hidden
          >
            <span className="text-lg font-bold leading-none">
              {badge.slice(0, 1).toUpperCase()}
            </span>
          </div>
          <h2 className="text-lg font-semibold text-slate-800 leading-snug m-0">
            {title}
          </h2>
          {desc ? (
            <p className="mt-1.5 mb-0 text-[13.5px] leading-relaxed text-slate-500">
              {desc}
            </p>
          ) : null}
          {timeLabel ? (
            <div className="mt-3 flex items-center gap-1.5 border-t border-slate-200 pt-2.5 text-xs font-semibold text-slate-500">
              {timeLabel} · {dayName}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-[20px] border border-slate-200 bg-white p-5 text-sm text-slate-500">
          {t(lang, 'scheduleEmptyDay')}
        </div>
      )}

      <div>
        <p className="mb-3 text-[13px] font-bold text-slate-800">
          {t(lang, 'scheduleRoutinesTitle')}
        </p>
        {periods.length === 0 ? (
          <p className="text-sm text-slate-500">{t(lang, 'scheduleEmptyDay')}</p>
        ) : (
          <div className="relative pl-5">
            <div className="absolute left-[5px] top-1.5 bottom-1.5 w-[1.5px] bg-slate-200" />
            <ul className="space-y-4">
              {periods.map(({ row, slot }) => {
                const isMain = mainRow != null && row.id === mainRow.id;
                const label =
                  row.rowType === 'routine'
                    ? row.routineDescription || '—'
                    : slot?.topic || row.subjectName || row.category || '—';
                const pinColor = isMain ? colors.fg : '#DCE3DD';

                return (
                  <li key={row.id} className="relative">
                    <span
                      className="absolute -left-5 top-0.5 h-[11px] w-[11px] rounded-full border-2 border-white"
                      style={{ background: pinColor }}
                    />
                    <div className="flex items-baseline justify-between gap-2">
                      <span
                        className={[
                          'text-[13px] text-slate-800',
                          isMain ? 'font-bold' : 'font-medium',
                        ].join(' ')}
                      >
                        {label}
                      </span>
                      <span className="shrink-0 text-[11.5px] text-slate-500">
                        {isMain
                          ? formatTimeRange(row.timeStart, row.timeEnd)
                          : row.timeStart}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
