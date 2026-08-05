'use client';

import type { Lang } from '@/lib/i18n/translations';
import { t, type TranslationKey } from '@/lib/i18n/translations';
import type { PortalWeeklyPlanRow } from '@/lib/portal/weekly-plan-types';
import { ROUTINE_COLOR, subjectColor } from '@/lib/portal/weekly-plan-colors';
import {
  addDaysISO,
  dayNumberFromWeekStart,
  formatTimeRange,
  isRowActiveOnDay,
  slotForDay,
  subjectAbbrev,
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
  dateFrom: string;
};

function monthShort(iso: string, lang: Lang): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-GB', {
    month: 'short',
  });
}

export function WeeklyPlanGridView({ lang, rows, dateFrom }: Props) {
  const sorted = [...rows].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.timeStart.localeCompare(b.timeStart);
  });

  const legend = new Map<string, { abbr: string; color: string }>();
  for (const row of sorted) {
    if (row.rowType !== 'routine') {
      for (let di = 0; di < 5; di++) {
        if (!isRowActiveOnDay(row, di)) continue;
        const slot = slotForDay(row, di);
        const subject = slot?.subjectName || row.subjectName || row.category;
        if (!subject) continue;
        const key = subject.trim().toLowerCase();
        if (legend.has(key)) continue;
        legend.set(key, {
          abbr: subjectAbbrev(subject),
          color: subjectColor(subject).fg,
        });
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[780px] border-collapse text-left">
          <thead>
            <tr className="bg-primary text-white">
              <th className="w-[88px] px-3 py-3 text-[11px] font-bold uppercase tracking-wide">
                {t(lang, 'scheduleTimeColumn')}
              </th>
              {WEEKDAY_KEYS.map((key, idx) => {
                const iso = addDaysISO(dateFrom, idx);
                const short = t(lang, key).slice(0, 3).toUpperCase();
                const dayNum = dayNumberFromWeekStart(dateFrom, idx);
                return (
                  <th
                    key={key}
                    className="px-2 py-3 text-center text-[11px] font-bold uppercase tracking-wide"
                  >
                    {short} {dayNum} {monthShort(iso, lang)}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                  {t(lang, 'scheduleEmptyDay')}
                </td>
              </tr>
            ) : (
              sorted.map((row) => {
                const isRoutine = row.rowType === 'routine';
                const timeLabel = formatTimeRange(row.timeStart, row.timeEnd);

                if (isRoutine) {
                  const label = row.routineDescription || '—';
                  return (
                    <tr key={row.id} className="border-t border-slate-100">
                      <td className="whitespace-nowrap px-3 py-2.5 align-middle text-[11px] font-semibold text-slate-500">
                        {timeLabel}
                      </td>
                      <td
                        colSpan={5}
                        className="px-2 py-2.5 text-center text-[12.5px] font-medium"
                        style={{ background: ROUTINE_COLOR.bg, color: ROUTINE_COLOR.fg }}
                      >
                        {label}
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="whitespace-nowrap px-3 py-2.5 align-top text-[11px] font-semibold text-slate-500">
                      {timeLabel}
                    </td>
                    {WEEKDAY_KEYS.map((key, di) => {
                      const active = isRowActiveOnDay(row, di);
                      const slot = active ? slotForDay(row, di) : null;
                      const subject =
                        slot?.subjectName || row.subjectName || row.category || null;
                      const topic = slot?.topic?.trim() || null;
                      const colors = subjectColor(subject);

                      if (!active || (!subject && !topic)) {
                        return (
                          <td
                            key={key}
                            className="px-2 py-2.5 text-center align-top text-[12px] text-slate-300"
                          >
                            —
                          </td>
                        );
                      }

                      return (
                        <td key={key} className="px-1.5 py-2 align-top">
                          <div
                            className="rounded-lg border-l-[3px] px-2 py-1.5"
                            style={{
                              background: colors.bg,
                              borderLeftColor: colors.fg,
                            }}
                          >
                            {subject ? (
                              <span
                                className="mb-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold"
                                style={{ background: 'rgba(255,255,255,0.75)', color: colors.fg }}
                              >
                                {subjectAbbrev(subject)}
                              </span>
                            ) : null}
                            <p
                              className="m-0 text-[11.5px] font-medium leading-snug"
                              style={{ color: colors.fg }}
                            >
                              {topic || subject || '—'}
                            </p>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {legend.size > 0 ? (
        <ul className="flex flex-wrap gap-x-4 gap-y-2 px-1">
          {[...legend.entries()].map(([key, item]) => (
            <li key={key} className="flex items-center gap-1.5 text-[11px] text-slate-600">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: item.color }}
                aria-hidden
              />
              <span className="font-bold" style={{ color: item.color }}>
                {item.abbr}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
