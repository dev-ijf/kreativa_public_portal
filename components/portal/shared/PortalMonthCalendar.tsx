"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { t, type Lang, type TranslationKey } from "@/lib/i18n/translations";

export type PortalCalendarDayMeta = {
  date: string;
  hasEntry: boolean;
};

const DEFAULT_DOW_KEYS: TranslationKey[] = [
  "habitsCalSun",
  "habitsCalMon",
  "habitsCalTue",
  "habitsCalWed",
  "habitsCalThu",
  "habitsCalFri",
  "habitsCalSat",
];

function formatTrendDate(iso: string, lang: Lang): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString(lang === "id" ? "id-ID" : "en-GB", {
    day: "numeric",
    month: "short",
  });
}

function buildCalendarCells(
  year: number,
  monthIndex0: number,
  daysMeta: PortalCalendarDayMeta[],
): ({ date: string; meta: PortalCalendarDayMeta | null; inMonth: boolean } | null)[][] {
  const metaBy = new Map(daysMeta.map((d) => [d.date, d]));
  const first = new Date(year, monthIndex0, 1);
  const startPad = first.getDay();
  const dim = new Date(year, monthIndex0 + 1, 0).getDate();
  const cells: ({ date: string; meta: PortalCalendarDayMeta | null; inMonth: boolean } | null)[] =
    [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) {
    const ds = `${year}-${String(monthIndex0 + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ date: ds, meta: metaBy.get(ds) ?? null, inMonth: true });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: typeof cells[] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }
  return rows;
}

export type PortalMonthCalendarLegendKeys = {
  title: TranslationKey;
  selected: TranslationKey;
  dot: TranslationKey;
  noDot: TranslationKey;
  future: TranslationKey;
  dayTitleFuture: TranslationKey;
  dayTitleHasData: TranslationKey;
  dayTitleEmpty: TranslationKey;
  selectedBadge: TranslationKey;
  prevMonth: TranslationKey;
  nextMonth: TranslationKey;
  futureDate?: TranslationKey;
};

type Props = {
  lang: Lang;
  calYear: number;
  calMonth0: number;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onShiftMonth: (delta: number) => void;
  days: PortalCalendarDayMeta[];
  loading: boolean;
  todayISO: string;
  legendKeys: PortalMonthCalendarLegendKeys;
  dowKeys?: TranslationKey[];
  showFutureWarning?: boolean;
};

function calendarDayTitle(
  lang: Lang,
  keys: PortalMonthCalendarLegendKeys,
  iso: string,
  future: boolean,
  hasData: boolean,
  selected: boolean,
): string {
  const d = formatTrendDate(iso, lang);
  if (future) return `${d} — ${t(lang, keys.dayTitleFuture)}`;
  const mid = hasData ? t(lang, keys.dayTitleHasData) : t(lang, keys.dayTitleEmpty);
  const tail = selected ? ` · ${t(lang, keys.selectedBadge)}` : "";
  return `${d} — ${mid}${tail}`;
}

export function PortalMonthCalendar({
  lang,
  calYear,
  calMonth0,
  selectedDate,
  onSelectDate,
  onShiftMonth,
  days,
  loading,
  todayISO,
  legendKeys,
  dowKeys = DEFAULT_DOW_KEYS,
  showFutureWarning = true,
}: Props) {
  const monthTitle = new Date(calYear, calMonth0, 1).toLocaleString(
    lang === "id" ? "id-ID" : "en-US",
    { month: "long", year: "numeric" },
  );

  const grid = buildCalendarCells(calYear, calMonth0, days);
  const isFuture = (ds: string) => ds > todayISO;

  return (
    <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          aria-label={t(lang, legendKeys.prevMonth)}
          onClick={() => onShiftMonth(-1)}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-600"
        >
          <ChevronLeft size={22} />
        </button>
        <span className="font-bold text-slate-800 capitalize">{monthTitle}</span>
        <button
          type="button"
          aria-label={t(lang, legendKeys.nextMonth)}
          onClick={() => onShiftMonth(1)}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-600"
        >
          <ChevronRight size={22} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] sm:text-[11px] font-bold text-slate-500 mb-2 px-0.5">
        {dowKeys.map((k) => (
          <div key={k}>{t(lang, k)}</div>
        ))}
      </div>
      {loading ? (
        <p className="text-center text-xs text-slate-400 py-6">…</p>
      ) : (
        grid.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {week.map((cell, ci) => {
              if (!cell) {
                return <div key={ci} className="h-11" />;
              }
              const fut = isFuture(cell.date);
              const sel = cell.date === selectedDate;
              const hasData = Boolean(cell.meta?.hasEntry);
              return (
                <button
                  key={cell.date}
                  type="button"
                  disabled={fut}
                  title={calendarDayTitle(lang, legendKeys, cell.date, fut, hasData, sel)}
                  onClick={() => {
                    if (fut) return;
                    onSelectDate(cell.date);
                  }}
                  className={[
                    "h-11 rounded-xl flex flex-col items-center justify-center text-sm font-bold relative transition-colors",
                    fut ? "text-slate-300 cursor-not-allowed bg-slate-50/60" : "",
                    !fut && sel
                      ? "bg-primary text-white shadow-md shadow-primary/25 ring-2 ring-primary/35 z-[1]"
                      : "",
                    !fut && !sel && hasData
                      ? "bg-emerald-50 text-emerald-950 ring-1 ring-emerald-200/90 hover:bg-emerald-100/90"
                      : "",
                    !fut && !sel && !hasData ? "text-slate-700 hover:bg-slate-100" : "",
                  ].join(" ")}
                >
                  {Number(cell.date.slice(8, 10))}
                  {hasData ? (
                    <span
                      className={[
                        "rounded-full mt-0.5 shrink-0",
                        sel ? "h-1.5 w-1.5 bg-white" : "h-2 w-2 bg-emerald-600 ring-2 ring-emerald-200/80",
                      ].join(" ")}
                      aria-hidden
                    />
                  ) : (
                    <span className="h-1.5 w-1.5 mt-0.5 rounded-full bg-transparent" aria-hidden />
                  )}
                </button>
              );
            })}
          </div>
        ))
      )}
      {!loading ? (
        <div
          className="mt-2.5 pt-2.5 border-t border-slate-100"
          role="note"
          aria-label={t(lang, legendKeys.title)}
        >
          <p className="text-[10px] font-semibold text-slate-600 mb-1.5">
            {t(lang, legendKeys.title)}
          </p>
          <ul className="space-y-1.5 text-[10px] text-slate-500 leading-snug">
            <li className="flex gap-2 items-start">
              <span
                className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-md bg-primary shadow-sm ring-1 ring-primary/30"
                aria-hidden
              />
              <span>{t(lang, legendKeys.selected)}</span>
            </li>
            <li className="flex gap-2 items-start">
              <span
                className="mt-0.5 flex h-4 w-4 shrink-0 flex-col items-center justify-end rounded-md border border-emerald-200 bg-emerald-50 pb-0.5 ring-1 ring-emerald-100"
                aria-hidden
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
              </span>
              <span>{t(lang, legendKeys.dot)}</span>
            </li>
            <li className="flex gap-2 items-start">
              <span
                className="mt-0.5 h-4 w-4 shrink-0 rounded-md border border-dashed border-slate-200 bg-white"
                aria-hidden
              />
              <span>{t(lang, legendKeys.noDot)}</span>
            </li>
            <li className="flex gap-2 items-start">
              <span
                className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-md border border-slate-100 bg-slate-50 text-[9px] font-semibold text-slate-300"
                aria-hidden
              >
                …
              </span>
              <span>{t(lang, legendKeys.future)}</span>
            </li>
          </ul>
        </div>
      ) : null}
      {showFutureWarning && legendKeys.futureDate && isFuture(selectedDate) ? (
        <p className="text-xs text-amber-600 mt-2 text-center">{t(lang, legendKeys.futureDate)}</p>
      ) : null}
    </div>
  );
}

export function monthRangeISO(y: number, m0: number): { from: string; to: string } {
  const from = `${y}-${String(m0 + 1).padStart(2, "0")}-01`;
  const last = new Date(y, m0 + 1, 0).getDate();
  const to = `${y}-${String(m0 + 1).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  return { from, to };
}

export function todayISO(): string {
  const n = new Date();
  const y = n.getFullYear();
  const m = n.getMonth() + 1;
  const d = n.getDate();
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
