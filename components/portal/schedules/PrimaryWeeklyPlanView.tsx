'use client';

import type { Lang } from '@/lib/i18n/translations';
import { t } from '@/lib/i18n/translations';
import type { PortalWeeklyPlanRow } from '@/lib/portal/weekly-plan-types';
import { ROUTINE_COLOR, subjectColor } from '@/lib/portal/weekly-plan-colors';
import { formatTimeRange, periodsForDay } from '@/lib/portal/weekly-plan-utils';

type Props = {
  lang: Lang;
  rows: PortalWeeklyPlanRow[];
  dayIndex: number;
};

export function PrimaryWeeklyPlanView({ lang, rows, dayIndex }: Props) {
  const periods = periodsForDay(rows, dayIndex);

  return (
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
              const topic =
                isRoutine
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
                    <div
                      className="rounded-xl px-3 py-2.5"
                      style={{ background: colors.bg }}
                    >
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
  );
}
