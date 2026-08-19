'use client';

import type { Lang } from '@/lib/i18n/translations';
import { t, type TranslationKey } from '@/lib/i18n/translations';
import type { PortalWeeklyPlanRow, PortalDayNote } from '@/lib/portal/weekly-plan-types';
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
  dayNotes?: PortalDayNote[];
};

type DayCell = {
  isRoutine: boolean;
  subject: string | null;
  topic: string | null;
  label: string;
};

type TimeBand = {
  key: string;
  timeStart: string;
  timeEnd: string;
  sortOrder: number;
  days: Array<DayCell | null>;
  /** All filled days share the same content → one spanning cell. */
  unified: boolean;
};

function monthShort(iso: string, lang: Lang): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-GB', {
    month: 'short',
  });
}

function cellSignature(cell: DayCell | null): string {
  if (!cell) return '';
  return [cell.isRoutine ? 'r' : 'i', cell.subject ?? '', cell.topic ?? '', cell.label].join('|');
}

function cellFromRow(row: PortalWeeklyPlanRow, dayIndex: number): DayCell | null {
  if (!isRowActiveOnDay(row, dayIndex)) return null;

  if (row.rowType === 'routine') {
    const label = row.routineDescription?.trim() || '—';
    return { isRoutine: true, subject: null, topic: null, label };
  }

  const slot = slotForDay(row, dayIndex);
  const subject = slot?.subjectName || row.subjectName || row.category || null;
  const topic = slot?.topic?.trim() || null;
  if (!subject && !topic) return null;
  return {
    isRoutine: false,
    subject,
    topic,
    label: topic || subject || '—',
  };
}

/** Prefer a filled instructional/topic cell over an empty or weaker match. */
function pickDayCell(
  group: PortalWeeklyPlanRow[],
  dayIndex: number,
): DayCell | null {
  let best: DayCell | null = null;
  let bestScore = -1;

  for (const row of group) {
    const cell = cellFromRow(row, dayIndex);
    if (!cell) continue;
    let score = 1;
    if (!cell.isRoutine) score += 2;
    if (cell.topic) score += 2;
    if (cell.subject) score += 1;
    if (score > bestScore) {
      best = cell;
      bestScore = score;
    }
  }
  return best;
}

function buildTimeBands(rows: PortalWeeklyPlanRow[]): TimeBand[] {
  const sorted = [...rows].sort((a, b) => {
    if (a.timeStart !== b.timeStart) return a.timeStart.localeCompare(b.timeStart);
    if (a.timeEnd !== b.timeEnd) return a.timeEnd.localeCompare(b.timeEnd);
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.id - b.id;
  });

  const groups = new Map<string, PortalWeeklyPlanRow[]>();
  const order: string[] = [];

  for (const row of sorted) {
    const key = `${row.timeStart}|${row.timeEnd}`;
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key)!.push(row);
  }

  return order.map((key) => {
    const group = groups.get(key)!;
    const [timeStart, timeEnd] = key.split('|') as [string, string];
    const days = [0, 1, 2, 3, 4].map((di) => pickDayCell(group, di));
    const filled = days.filter((c): c is DayCell => c != null);
    const firstSig = filled.length > 0 ? cellSignature(filled[0]!) : '';
    const unified =
      filled.length > 0 && filled.every((c) => cellSignature(c) === firstSig);

    return {
      key,
      timeStart,
      timeEnd,
      sortOrder: Math.min(...group.map((r) => r.sortOrder)),
      days,
      unified,
    };
  });
}

function CellCard({ cell }: { cell: DayCell }) {
  if (cell.isRoutine) {
    return (
      <div
        className="rounded-lg px-2 py-1.5 text-center text-[12.5px] font-medium"
        style={{ background: ROUTINE_COLOR.bg, color: ROUTINE_COLOR.fg }}
      >
        {cell.label}
      </div>
    );
  }

  const colors = subjectColor(cell.subject);
  return (
    <div
      className="rounded-lg border-l-[3px] px-2 py-1.5"
      style={{
        background: colors.bg,
        borderLeftColor: colors.fg,
      }}
    >
      {cell.subject ? (
        <span
          className="mb-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold"
          style={{ background: 'rgba(255,255,255,0.75)', color: colors.fg }}
        >
          {subjectAbbrev(cell.subject)}
        </span>
      ) : null}
      <p className="m-0 text-[11.5px] font-medium leading-snug" style={{ color: colors.fg }}>
        {cell.label}
      </p>
    </div>
  );
}

export function WeeklyPlanGridView({ lang, rows, dateFrom, dayNotes }: Props) {
  const bands = buildTimeBands(rows);

  const legend = new Map<string, { abbr: string; color: string }>();
  for (const band of bands) {
    for (const cell of band.days) {
      if (!cell || cell.isRoutine || !cell.subject) continue;
      const key = cell.subject.trim().toLowerCase();
      if (legend.has(key)) continue;
      legend.set(key, {
        abbr: subjectAbbrev(cell.subject),
        color: subjectColor(cell.subject).fg,
      });
    }
  }

  const hasDayNotes = (dayNotes ?? []).some(
    (n) => n.uniformLabel?.trim() || n.parentPrep?.trim()
  );

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
            {bands.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                  {t(lang, 'scheduleEmptyDay')}
                </td>
              </tr>
            ) : (
              bands.map((band) => {
                const timeLabel = formatTimeRange(band.timeStart, band.timeEnd);
                const sample = band.days.find((c) => c != null) ?? null;

                if (band.unified && sample) {
                  const isRoutine = sample.isRoutine;
                  return (
                    <tr key={band.key} className="border-t border-slate-100">
                      <td className="whitespace-nowrap px-3 py-2.5 align-middle text-[11px] font-semibold text-slate-500">
                        {timeLabel}
                      </td>
                      <td
                        colSpan={5}
                        className="px-2 py-2.5 text-center text-[12.5px] font-medium"
                        style={
                          isRoutine
                            ? { background: ROUTINE_COLOR.bg, color: ROUTINE_COLOR.fg }
                            : {
                                background: subjectColor(sample.subject).bg,
                                color: subjectColor(sample.subject).fg,
                              }
                        }
                      >
                        {sample.label}
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={band.key} className="border-t border-slate-100">
                    <td className="whitespace-nowrap px-3 py-2.5 align-top text-[11px] font-semibold text-slate-500">
                      {timeLabel}
                    </td>
                    {WEEKDAY_KEYS.map((key, di) => {
                      const cell = band.days[di] ?? null;
                      if (!cell) {
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
                          <CellCard cell={cell} />
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

      {hasDayNotes ? (
        <div className="overflow-x-auto rounded-2xl border border-amber-200 bg-amber-50/70">
          <table className="w-full min-w-[780px] border-collapse text-left">
            <thead>
              <tr className="border-b border-amber-200/80">
                <th className="w-[88px] px-3 py-2 text-[10px] font-bold uppercase text-amber-800/70">
                  {t(lang, 'scheduleUniformLabel')}
                </th>
                {WEEKDAY_KEYS.map((key, idx) => {
                  const note = (dayNotes ?? []).find((n) => n.dayIndex === idx);
                  const uniform = note?.uniformLabel?.trim() || '';
                  return (
                    <th
                      key={key}
                      className="px-2 py-2 text-center text-[11px] font-semibold text-amber-950"
                    >
                      {uniform || <span className="font-normal text-amber-800/40">—</span>}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-3 py-2 text-[10px] font-bold uppercase text-amber-800/70 align-top">
                  {t(lang, 'scheduleParentPrepTitle')}
                </td>
                {WEEKDAY_KEYS.map((key, idx) => {
                  const note = (dayNotes ?? []).find((n) => n.dayIndex === idx);
                  const prep = note?.parentPrep?.trim() || '';
                  return (
                    <td
                      key={key}
                      className="px-2 py-2 align-top text-[11px] text-amber-950 whitespace-pre-wrap"
                    >
                      {prep || <span className="text-amber-800/30">—</span>}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      ) : null}

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
