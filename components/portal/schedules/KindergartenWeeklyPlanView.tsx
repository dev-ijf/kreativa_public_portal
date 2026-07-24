'use client';

import { Clock } from 'lucide-react';
import type { Lang } from '@/lib/i18n/translations';
import { t, type TranslationKey } from '@/lib/i18n/translations';
import type { PortalWeeklyPlanRow } from '@/lib/portal/weekly-plan-types';
import { subjectColor } from '@/lib/portal/weekly-plan-colors';
import {
  findKindergartenMainRow,
  formatTimeRange,
  periodsForDay,
  slotForDay,
} from '@/lib/portal/weekly-plan-utils';

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
};

export function KindergartenWeeklyPlanView({ lang, rows, dayIndex }: Props) {
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
  const dayName = t(lang, WEEKDAY_KEYS[dayIndex] ?? 'weekdayMon');

  const periods = periodsForDay(rows, dayIndex);

  return (
    <div className="space-y-5">
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
              <Clock size={13} strokeWidth={2} />
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
