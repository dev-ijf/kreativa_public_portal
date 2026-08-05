'use client';

import type { Lang } from '@/lib/i18n/translations';
import { t, type TranslationKey } from '@/lib/i18n/translations';
import type { PortalLmsSession } from '@/lib/portal/lms-weekly-plan-types';
import { subjectColor } from '@/lib/portal/weekly-plan-colors';
import {
  addDaysISO,
  dayNumberFromWeekStart,
  formatTimeRange,
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
  sessions: PortalLmsSession[];
  dateFrom: string;
};

function monthShort(iso: string, lang: Lang): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-GB', {
    month: 'short',
  });
}

function sortSessions(list: PortalLmsSession[]): PortalLmsSession[] {
  return [...list].sort((a, b) => {
    const ta = a.startTime ?? '';
    const tb = b.startTime ?? '';
    if (ta !== tb) return ta.localeCompare(tb);
    return a.id - b.id;
  });
}

export function SecondaryWeeklyGridView({ lang, sessions, dateFrom }: Props) {
  const byDay = WEEKDAY_KEYS.map((_, di) =>
    sortSessions(sessions.filter((s) => s.dayIndex === di)),
  );

  const legend = new Map<string, { abbr: string; color: string }>();
  for (const s of sessions) {
    const key = s.subjectName.trim().toLowerCase();
    if (!key || legend.has(key)) continue;
    legend.set(key, {
      abbr: subjectAbbrev(s.subjectName),
      color: subjectColor(s.subjectName).fg,
    });
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid min-w-[780px] grid-cols-5 divide-x divide-slate-100">
          {WEEKDAY_KEYS.map((key, di) => {
            const iso = addDaysISO(dateFrom, di);
            const short = t(lang, key).slice(0, 3).toUpperCase();
            const dayNum = dayNumberFromWeekStart(dateFrom, di);
            const daySessions = byDay[di] ?? [];

            return (
              <div key={key} className="min-w-0">
                <div className="bg-primary px-2 py-3 text-center text-[11px] font-bold uppercase tracking-wide text-white">
                  {short} {dayNum} {monthShort(iso, lang)}
                </div>
                <ul className="space-y-2 p-2 min-h-[120px]">
                  {daySessions.length === 0 ? (
                    <li className="px-1 py-6 text-center text-[12px] text-slate-300">—</li>
                  ) : (
                    daySessions.map((session) => {
                      const colors = subjectColor(session.subjectName);
                      const timeLabel =
                        session.startTime && session.endTime
                          ? formatTimeRange(session.startTime, session.endTime)
                          : session.startTime;

                      return (
                        <li key={session.id}>
                          <div
                            className="rounded-lg border-l-[3px] px-2 py-1.5"
                            style={{
                              background: colors.bg,
                              borderLeftColor: colors.fg,
                            }}
                          >
                            {timeLabel ? (
                              <p className="mb-1 text-[10px] font-semibold text-slate-500">
                                {timeLabel}
                              </p>
                            ) : null}
                            <span
                              className="mb-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold"
                              style={{
                                background: 'rgba(255,255,255,0.75)',
                                color: colors.fg,
                              }}
                            >
                              {subjectAbbrev(session.subjectName)}
                            </span>
                            <p
                              className="m-0 text-[11.5px] font-medium leading-snug"
                              style={{ color: colors.fg }}
                            >
                              {session.title}
                            </p>
                          </div>
                        </li>
                      );
                    })
                  )}
                </ul>
              </div>
            );
          })}
        </div>
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
