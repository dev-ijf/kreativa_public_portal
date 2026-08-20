'use client';

import { CalendarOff } from 'lucide-react';
import type { Lang } from '@/lib/i18n/translations';
import { t } from '@/lib/i18n/translations';
import type { PortalWeeklyPlanRow, PortalDayNote } from '@/lib/portal/weekly-plan-types';
import { ROUTINE_COLOR, subjectColor } from '@/lib/portal/weekly-plan-colors';
import {
  findDayOffForDay,
  formatTimeRange,
  periodsForDay,
} from '@/lib/portal/weekly-plan-utils';
import { DayParentPrepCard } from '@/components/portal/schedules/DayParentPrepCard';

type Props = {
  lang: Lang;
  rows: PortalWeeklyPlanRow[];
  dayIndex: number;
  dayNote?: PortalDayNote | null;
};

export function PrimaryWeeklyPlanView({ lang, rows, dayIndex, dayNote }: Props) {
  const dayOff = findDayOffForDay(rows, dayIndex);

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
          <p className="mt-1.5 mb-0 text-xs text-rose-800/70">{t(lang, 'scheduleDayOffHint')}</p>
        </div>
      </div>
    );
  }

  const periods = periodsForDay(rows, dayIndex);

  return (
    <div className="space-y-5">
      <DayParentPrepCard lang={lang} note={dayNote} />

      <div>
        <p className="mb-3 text-[13px] font-bold text-slate-800">
          {t(lang, 'scheduleDayScheduleTitle')}
        </p>
        {periods.length === 0 ? (
          <p className="text-sm text-slate-500">{t(lang, 'scheduleEmptyDay')}</p>
        ) : (
          <div className="relative pl-5">
            <div className="absolute left-[5px] top-1.5 bottom-1.5 w-[1.5px] bg-slate-200" />
            <ul className="space-y-3.5">
              {periods.map(({ row, slot }) => {
                const isRoutine = row.rowType === 'routine';
                const subject =
                  slot?.subjectName || row.subjectName || row.category || null;
                const colors = isRoutine ? ROUTINE_COLOR : subjectColor(subject);
                const topic = isRoutine
                  ? row.routineDescription || '—'
                  : slot?.topic?.trim() || subject || '—';

                return (
                  <li key={row.id} className="relative pb-0.5">
                    <span
                      className="absolute -left-5 top-1 h-[11px] w-[11px] rounded-full border-2 border-white"
                      style={{ background: isRoutine ? '#DCE3DD' : colors.fg }}
                    />
                    <p className="mb-1.5 text-[11px] font-semibold text-slate-500">
                      {formatTimeRange(row.timeStart, row.timeEnd)}
                    </p>
                    {isRoutine ? (
                      <div
                        className="rounded-xl px-3 py-2.5 text-[12.5px] font-medium"
                        style={{ background: colors.bg, color: colors.fg }}
                      >
                        {topic}
                      </div>
                    ) : (
                      <div className="rounded-xl px-3 py-2.5" style={{ background: colors.bg }}>
                        {subject ? (
                          <span
                            className="mb-1.5 inline-block rounded-full bg-white px-2.5 py-0.5 text-[11px] font-bold"
                            style={{ color: colors.fg }}
                          >
                            {subject}
                          </span>
                        ) : null}
                        <div
                          className="text-[13px] font-medium leading-snug"
                          style={{ color: colors.fg }}
                        >
                          {topic}
                        </div>
                      </div>
                    )}
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
