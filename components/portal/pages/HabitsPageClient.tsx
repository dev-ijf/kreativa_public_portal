"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BarChart2, ChevronLeft, ChevronRight } from "lucide-react";
import { Header } from "@/components/portal/Header";
import { ChildSelector } from "@/components/portal/ChildSelector";
import { usePortalState } from "@/components/portal/state/PortalProvider";
import {
  HABIT_BOOLEAN_KEYS,
  emptyHabitPayload,
  type HabitBooleanKey,
  type HabitCalendarDay,
  type HabitSummaryResponse,
  type OnTimeArrivalValue,
  type PortalHabitDayPayload,
} from "@/lib/portal/habits-shared";
import { t, type Lang, type TranslationKey } from "@/lib/i18n/translations";

function todayISO(): string {
  const n = new Date();
  const y = n.getFullYear();
  const m = n.getMonth() + 1;
  const d = n.getDate();
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function monthRangeISO(y: number, m0: number): { from: string; to: string } {
  const from = `${y}-${String(m0 + 1).padStart(2, "0")}-01`;
  const last = new Date(y, m0 + 1, 0).getDate();
  const to = `${y}-${String(m0 + 1).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  return { from, to };
}

function formatTrendDate(iso: string, lang: Lang): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString(lang === "id" ? "id-ID" : "en-GB", {
    day: "numeric",
    month: "short",
  });
}

function habitsCalendarDayTitle(
  lang: Lang,
  iso: string,
  future: boolean,
  hasData: boolean,
  selected: boolean,
): string {
  const d = formatTrendDate(iso, lang);
  if (future) return `${d} — ${t(lang, "habitsCalDayTitleFuture")}`;
  const mid = hasData ? t(lang, "habitsCalDayTitleHasData") : t(lang, "habitsCalDayTitleEmpty");
  const tail = selected ? ` · ${t(lang, "habitsCalSelectedBadge")}` : "";
  return `${d} — ${mid}${tail}`;
}

/** Row labels (what to tick) — wording differs from section titles to avoid repetition. */
const HABIT_ROW_LABEL_KEY: Record<HabitBooleanKey, TranslationKey> = {
  fajr: "habitRowFajr",
  dhuhr: "habitRowDhuhr",
  asr: "habitRowAsr",
  maghrib: "habitRowMaghrib",
  isha: "habitRowIsha",
  dhuha: "habitRowDhuha",
  tahajud: "habitRowTahajud",
  read_quran: "habitRowReadQuran",
  sunnah_fasting: "habitRowSunnahFasting",
  wake_up_early: "habitRowWakeUp",
  help_parents: "habitRowHelpParents",
  pray_with_parents: "habitRowPrayWithParents",
  give_greetings: "habitRowGiveGreetings",
  smile_greet_polite: "habitRowSmileGreet",
  parent_hug_pray: "habitRowParentHugPray",
  child_tell_parents: "habitRowChildTell",
};

const CAL_DOW_KEYS: TranslationKey[] = [
  "habitsCalSun",
  "habitsCalMon",
  "habitsCalTue",
  "habitsCalWed",
  "habitsCalThu",
  "habitsCalFri",
  "habitsCalSat",
];

function parseOnTimeFromApi(v: unknown): OnTimeArrivalValue {
  if (
    v === "on_time" ||
    v === "late" ||
    v === "permission" ||
    v === "sick" ||
    v === "holiday"
  ) {
    return v;
  }
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "on_time" || s === "tepat" || s === "ya") return "on_time";
    if (s === "late" || s === "terlambat") return "late";
    if (s === "permission" || s === "izin") return "permission";
    if (s === "sick" || s === "sakit") return "sick";
    if (s === "holiday" || s === "libur") return "holiday";
  }
  return null;
}

function apiRowToPayload(row: unknown): PortalHabitDayPayload {
  const base = emptyHabitPayload();
  if (!row || typeof row !== "object") return base;
  const r = row as Record<string, unknown>;
  for (const k of HABIT_BOOLEAN_KEYS) {
    if (typeof r[k] === "boolean") base[k] = r[k];
  }
  base.onTimeArrival = parseOnTimeFromApi(r.onTimeArrival ?? r.on_time_arrival);
  const q = r.quranJuzInfo ?? r.quran_juz_info;
  base.quranJuzInfo = typeof q === "string" && q.trim() ? q : null;
  return base;
}

function payloadScorePct(p: PortalHabitDayPayload): { done: number; total: number } {
  let done = 0;
  for (const k of HABIT_BOOLEAN_KEYS) {
    if (p[k]) done += 1;
  }
  return { done, total: HABIT_BOOLEAN_KEYS.length };
}

function buildCalendarCells(
  year: number,
  monthIndex0: number,
  daysMeta: HabitCalendarDay[],
): ({ date: string; meta: HabitCalendarDay | null; inMonth: boolean } | null)[][] {
  const metaBy = new Map(daysMeta.map((d) => [d.date, d]));
  const first = new Date(year, monthIndex0, 1);
  const startPad = first.getDay();
  const dim = new Date(year, monthIndex0 + 1, 0).getDate();
  const cells: ({ date: string; meta: HabitCalendarDay | null; inMonth: boolean } | null)[] = [];
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

function HabitItem({
  checked,
  label,
  onToggle,
  disabled,
}: {
  checked: boolean;
  label: string;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      className={[
        "w-full flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50",
        disabled ? "opacity-40 pointer-events-none" : "hover:bg-slate-100",
      ].join(" ")}
    >
      <span className="font-medium text-slate-600 text-sm text-left leading-snug">{label}</span>
      <span
        className={[
          "w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0",
          checked ? "bg-emerald-500 text-white" : "bg-white border border-slate-200 text-slate-400",
        ].join(" ")}
      >
        {checked ? "✓" : ""}
      </span>
    </button>
  );
}

function trendXLabelIndices(n: number): number[] {
  if (n <= 0) return [];
  if (n <= 6) return Array.from({ length: n }, (_, i) => i);
  if (n <= 14) return [0, Math.floor(n / 3), Math.floor((2 * n) / 3), n - 1];
  return [0, Math.floor(n / 4), Math.floor(n / 2), Math.floor((3 * n) / 4), n - 1];
}

function TrendChart({
  points,
  lang,
}: {
  points: { date: string; scorePct: number }[];
  lang: Lang;
}) {
  const n = points.length;
  if (n === 0) return null;

  const W = 300;
  const H = 128;
  const plotLeft = 44;
  const plotRight = W - 10;
  const plotTop = 24;
  const plotBottom = 86;
  const plotW = plotRight - plotLeft;
  const plotH = plotBottom - plotTop;

  const xAt = (i: number) =>
    n <= 1 ? plotLeft + plotW / 2 : plotLeft + (i / (n - 1)) * plotW;
  const yAt = (pct: number) => plotTop + ((100 - pct) / 100) * plotH;
  const yTicks = [100, 75, 50, 25, 0];
  const xIdxs = trendXLabelIndices(n);

  const pathD =
    n === 1
      ? `M ${xAt(0).toFixed(1)} ${yAt(points[0].scorePct).toFixed(1)}`
      : points
          .map((p, i) => `${i === 0 ? "M" : "L"} ${xAt(i).toFixed(1)} ${yAt(p.scorePct).toFixed(1)}`)
          .join(" ");

  const yTitle = t(lang, "habitsTrendYAxis");
  const xTitle = t(lang, "habitsTrendXAxis");
  const slate = "#64748b";
  const grid = "#e2e8f0";

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-slate-500 leading-snug">{t(lang, "habitsTrendFootnote")}</p>
      {n < 2 ? (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
          {t(lang, "habitsTrendSingleDay")}
        </p>
      ) : null}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto max-h-44 text-primary"
        role="img"
        aria-label={`${t(lang, "habitsTrendTitle")}: ${yTitle}, ${xTitle}`}
      >
        <text x={W / 2} y={12} fontSize="10" fill={slate} textAnchor="middle" fontWeight="600">
          {yTitle}
        </text>
        {yTicks.map((pct) => (
          <text key={pct} x={plotLeft - 6} y={yAt(pct) + 3} fontSize="9" fill={slate} textAnchor="end">
            {pct}%
          </text>
        ))}
        {yTicks.map((pct) => (
          <line
            key={`grid-${pct}`}
            x1={plotLeft}
            y1={yAt(pct)}
            x2={plotRight}
            y2={yAt(pct)}
            stroke={grid}
            strokeWidth="1"
          />
        ))}
        <line
          x1={plotLeft}
          y1={plotTop}
          x2={plotLeft}
          y2={plotBottom}
          stroke={grid}
          strokeWidth="1"
        />
        <line
          x1={plotLeft}
          y1={plotBottom}
          x2={plotRight}
          y2={plotBottom}
          stroke={grid}
          strokeWidth="1"
        />
        {n >= 2 ? (
          <path
            d={pathD}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <circle cx={xAt(0)} cy={yAt(points[0].scorePct)} r="5" fill="currentColor" />
        )}
        {xIdxs.map((i) => (
          <text key={i} x={xAt(i)} y={H - 28} fontSize="9" fill={slate} textAnchor="middle">
            {formatTrendDate(points[i].date, lang)}
          </text>
        ))}
        <text x={W / 2} y={H - 10} fontSize="10" fill={slate} textAnchor="middle" fontWeight="600">
          {xTitle}
        </text>
      </svg>
    </div>
  );
}

export function HabitsPageClient() {
  const { lang, activeChildId } = usePortalState();
  const [tab, setTab] = useState<"daily" | "summary">("daily");
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth0, setCalMonth0] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState(todayISO);
  const [calendarDays, setCalendarDays] = useState<HabitCalendarDay[]>([]);
  const [payload, setPayload] = useState<PortalHabitDayPayload>(() => emptyHabitPayload());
  const [loadingDay, setLoadingDay] = useState(false);
  const [loadingCal, setLoadingCal] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [summary, setSummary] = useState<HabitSummaryResponse | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const lastHydratedJson = useRef<string>("");
  const [habitsCanSave, setHabitsCanSave] = useState(false);
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);

  const loadCalendar = useCallback(async () => {
    if (!activeChildId) {
      setCalendarDays([]);
      return;
    }
    setLoadingCal(true);
    try {
      const params = new URLSearchParams({
        studentId: String(activeChildId),
        year: String(calYear),
        month: String(calMonth0 + 1),
      });
      const res = await fetch(`/api/portal/habits/calendar?${params}`);
      if (!res.ok) {
        setCalendarDays([]);
        return;
      }
      const data = (await res.json()) as { days?: HabitCalendarDay[] };
      setCalendarDays(Array.isArray(data.days) ? data.days : []);
    } finally {
      setLoadingCal(false);
    }
  }, [activeChildId, calYear, calMonth0]);

  const loadDay = useCallback(async () => {
    setHabitsCanSave(false);
    if (!activeChildId) {
      setPayload(emptyHabitPayload());
      lastHydratedJson.current = "";
      return;
    }
    setLoadingDay(true);
    try {
      const params = new URLSearchParams({
        studentId: String(activeChildId),
        date: selectedDate,
      });
      const res = await fetch(`/api/portal/habits/day?${params}`);
      if (!res.ok) {
        const empty = emptyHabitPayload();
        setPayload(empty);
        lastHydratedJson.current = JSON.stringify({
          studentId: activeChildId,
          date: selectedDate,
          ...empty,
        });
        setHabitsCanSave(res.status !== 403);
        return;
      }
      const data = (await res.json()) as { row: unknown };
      const next = apiRowToPayload(data.row);
      setPayload(next);
      lastHydratedJson.current = JSON.stringify({
        studentId: activeChildId,
        date: selectedDate,
        ...next,
      });
      setHabitsCanSave(true);
    } finally {
      setLoadingDay(false);
    }
  }, [activeChildId, selectedDate]);

  const loadSummary = useCallback(async () => {
    if (!activeChildId) {
      setSummary(null);
      return;
    }
    const { from, to } = monthRangeISO(calYear, calMonth0);
    setLoadingSummary(true);
    try {
      const params = new URLSearchParams({
        studentId: String(activeChildId),
        from,
        to,
      });
      const res = await fetch(`/api/portal/habits/summary?${params}`);
      if (!res.ok) {
        setSummary(null);
        return;
      }
      setSummary((await res.json()) as HabitSummaryResponse);
    } finally {
      setLoadingSummary(false);
    }
  }, [activeChildId, calYear, calMonth0]);

  useEffect(() => {
    void loadCalendar();
  }, [loadCalendar]);

  useEffect(() => {
    void loadDay();
  }, [loadDay]);

  useEffect(() => {
    if (tab === "summary") void loadSummary();
  }, [tab, loadSummary]);

  useEffect(() => {
    if (!saveConfirmOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSaveConfirmOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saveConfirmOpen]);

  useEffect(() => {
    setSaveConfirmOpen(false);
  }, [selectedDate, activeChildId]);

  const saveBodyJson = useMemo(() => {
    if (!activeChildId) return "";
    return JSON.stringify({
      studentId: activeChildId,
      date: selectedDate,
      ...payload,
    });
  }, [activeChildId, selectedDate, payload]);

  const isDirty = useMemo(() => {
    if (!activeChildId || loadingDay) return false;
    if (selectedDate > todayISO()) return false;
    if (!habitsCanSave) return false;
    if (!saveBodyJson) return false;
    return saveBodyJson !== lastHydratedJson.current;
  }, [activeChildId, loadingDay, selectedDate, saveBodyJson, habitsCanSave]);

  const performSave = useCallback(async () => {
    if (!activeChildId || selectedDate > todayISO() || !habitsCanSave) return false;
    const bodyJson = saveBodyJson;
    if (!bodyJson || bodyJson === lastHydratedJson.current) return true;
    setSaveState("saving");
    try {
      const res = await fetch("/api/portal/habits/day", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: bodyJson,
      });
      if (!res.ok) {
        setSaveState("error");
        return false;
      }
      lastHydratedJson.current = bodyJson;
      setSaveState("saved");
      void loadCalendar();
      void loadSummary();
      window.setTimeout(() => setSaveState("idle"), 1500);
      return true;
    } catch {
      setSaveState("error");
      return false;
    }
  }, [activeChildId, selectedDate, saveBodyJson, loadCalendar, loadSummary, habitsCanSave]);

  const shiftMonth = (delta: number) => {
    const d = new Date(calYear, calMonth0 + delta, 1);
    setCalYear(d.getFullYear());
    setCalMonth0(d.getMonth());
  };

  const monthTitle = useMemo(() => {
    const d = new Date(calYear, calMonth0, 1);
    return d.toLocaleString(lang === "id" ? "id-ID" : "en-US", { month: "long", year: "numeric" });
  }, [calYear, calMonth0, lang]);

  const grid = useMemo(
    () => buildCalendarCells(calYear, calMonth0, calendarDays),
    [calYear, calMonth0, calendarDays],
  );

  const score = useMemo(() => payloadScorePct(payload), [payload]);

  const isFuture = (ds: string) => ds > todayISO();

  const onTimeOptions: { val: OnTimeArrivalValue; key: TranslationKey }[] = [
    { val: null, key: "habitsOnTimeUnset" },
    { val: "on_time", key: "habitsOnTimeOn" },
    { val: "late", key: "habitsOnTimeLate" },
    { val: "permission", key: "habitsOnTimePermission" },
    { val: "sick", key: "habitsOnTimeSick" },
    { val: "holiday", key: "habitsOnTimeHoliday" },
  ];

  const onTimeControl = (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {onTimeOptions.map(({ val, key }) => (
        <button
          key={key}
          type="button"
          onClick={() => setPayload((p) => ({ ...p, onTimeArrival: val }))}
          disabled={isFuture(selectedDate)}
          className={[
            "px-2 py-2.5 rounded-xl text-[11px] font-semibold border leading-tight text-center",
            payload.onTimeArrival === val
              ? "bg-primary text-white border-primary"
              : "bg-white text-slate-600 border-slate-200",
            isFuture(selectedDate) ? "opacity-40 pointer-events-none" : "",
          ].join(" ")}
        >
          {t(lang, key)}
        </button>
      ))}
    </div>
  );

  const habitSection = (
    title: string,
    keys: HabitBooleanKey[],
    disabled: boolean,
    subtitle?: string,
  ) => (
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
      <h3 className="font-bold text-slate-700">{title}</h3>
      {subtitle ? (
        <p className="text-xs text-slate-500 mt-1.5 mb-3 leading-relaxed">{subtitle}</p>
      ) : (
        <div className="h-3" aria-hidden />
      )}
      <div className="space-y-2">
        {keys.map((k) => (
          <HabitItem
            key={k}
            checked={payload[k]}
            label={t(lang, HABIT_ROW_LABEL_KEY[k])}
            disabled={disabled}
            onToggle={() =>
              setPayload((p) => ({
                ...p,
                [k]: !p[k],
              }))
            }
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-6">
      <Header title={t(lang, "habits")} backHref="/" />
      <ChildSelector />
      <p className="px-4 text-center text-xs text-slate-500 -mt-1 mb-1">{t(lang, "habitsFormSubtitle")}</p>

      <div className="px-4">
        {!activeChildId ? (
          <p className="text-center text-sm text-slate-500 mt-4">{t(lang, "habitsNoChild")}</p>
        ) : null}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-2 flex gap-2 mt-2">
          <button
            type="button"
            onClick={() => setTab("daily")}
            className={[
              "flex-1 py-2.5 rounded-xl font-bold text-sm",
              tab === "daily" ? "bg-primary text-white" : "bg-slate-100 text-slate-700",
            ].join(" ")}
          >
            {t(lang, "habitsDailyTab")}
          </button>
          <button
            type="button"
            onClick={() => setTab("summary")}
            className={[
              "flex-1 py-2.5 rounded-xl font-bold text-sm",
              tab === "summary" ? "bg-primary text-white" : "bg-slate-100 text-slate-700",
            ].join(" ")}
          >
            {t(lang, "habitsSummaryTab")}
          </button>
        </div>

        {tab === "daily" && activeChildId ? (
          <div className="mt-4 space-y-4">
            <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <button
                  type="button"
                  aria-label={t(lang, "habitsPrevMonth")}
                  onClick={() => shiftMonth(-1)}
                  className="p-2 rounded-xl hover:bg-slate-100 text-slate-600"
                >
                  <ChevronLeft size={22} />
                </button>
                <span className="font-bold text-slate-800 capitalize">{monthTitle}</span>
                <button
                  type="button"
                  aria-label={t(lang, "habitsNextMonth")}
                  onClick={() => shiftMonth(1)}
                  className="p-2 rounded-xl hover:bg-slate-100 text-slate-600"
                >
                  <ChevronRight size={22} />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] sm:text-[11px] font-bold text-slate-500 mb-2 px-0.5">
                {CAL_DOW_KEYS.map((k) => (
                  <div key={k}>{t(lang, k)}</div>
                ))}
              </div>
              {loadingCal ? (
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
                          title={habitsCalendarDayTitle(lang, cell.date, fut, hasData, sel)}
                          onClick={() => {
                            if (fut) return;
                            setSelectedDate(cell.date);
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
              {!loadingCal ? (
                <div
                  className="mt-2.5 pt-2.5 border-t border-slate-100"
                  role="note"
                  aria-label={t(lang, "habitsCalLegendTitle")}
                >
                  <p className="text-[10px] font-semibold text-slate-600 mb-1.5">
                    {t(lang, "habitsCalLegendTitle")}
                  </p>
                  <ul className="space-y-1.5 text-[10px] text-slate-500 leading-snug">
                    <li className="flex gap-2 items-start">
                      <span
                        className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-md bg-primary shadow-sm ring-1 ring-primary/30"
                        aria-hidden
                      />
                      <span>{t(lang, "habitsCalLegendSelected")}</span>
                    </li>
                    <li className="flex gap-2 items-start">
                      <span
                        className="mt-0.5 flex h-4 w-4 shrink-0 flex-col items-center justify-end rounded-md border border-emerald-200 bg-emerald-50 pb-0.5 ring-1 ring-emerald-100"
                        aria-hidden
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                      </span>
                      <span>{t(lang, "habitsCalLegendDot")}</span>
                    </li>
                    <li className="flex gap-2 items-start">
                      <span
                        className="mt-0.5 h-4 w-4 shrink-0 rounded-md border border-dashed border-slate-200 bg-white"
                        aria-hidden
                      />
                      <span>{t(lang, "habitsCalLegendNoDot")}</span>
                    </li>
                    <li className="flex gap-2 items-start">
                      <span
                        className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-md border border-slate-100 bg-slate-50 text-[9px] font-semibold text-slate-300"
                        aria-hidden
                      >
                        …
                      </span>
                      <span>{t(lang, "habitsCalLegendFuture")}</span>
                    </li>
                  </ul>
                </div>
              ) : null}
              {isFuture(selectedDate) ? (
                <p className="text-xs text-amber-600 mt-2 text-center">{t(lang, "habitsFutureDate")}</p>
              ) : null}
            </div>

            <div className="flex items-center justify-between px-1 gap-3">
              <div className="min-w-0">
                <p className="text-xs text-slate-500">{t(lang, "habitsScoreLabel")}</p>
                <p className="text-2xl font-black text-slate-800">
                  {score.done}/{score.total}
                  <span className="text-sm font-bold text-slate-400 ml-1">
                    ({score.total ? Math.round((score.done / score.total) * 100) : 0}%)
                  </span>
                </p>
                <p className="text-[11px] text-slate-400 mt-1">{t(lang, "habitsSaveHint")}</p>
              </div>
              <div className="text-xs font-bold text-right shrink-0 text-slate-500 min-h-5 max-w-[8rem]">
                {saveState === "saving" ? t(lang, "habitsSaving") : null}
                {saveState === "saved" ? t(lang, "habitsSaved") : null}
                {saveState === "error" ? t(lang, "habitsSaveError") : null}
              </div>
            </div>

            {loadingDay ? (
              <p className="text-center text-sm text-slate-400">…</p>
            ) : (
              <>
                {habitSection(
                  t(lang, "habitsSectionWake"),
                  ["wake_up_early"],
                  isFuture(selectedDate),
                )}
                {habitSection(
                  t(lang, "habitsSectionWajib"),
                  ["fajr", "dhuhr", "asr", "maghrib", "isha"],
                  isFuture(selectedDate),
                  t(lang, "habitsSectionWajibHint"),
                )}
                {habitSection(
                  t(lang, "habitsSectionSunnahExtra"),
                  ["dhuha", "tahajud", "sunnah_fasting", "pray_with_parents"],
                  isFuture(selectedDate),
                )}
                {habitSection(
                  t(lang, "habitsSectionMengajiMaghrib"),
                  ["read_quran"],
                  isFuture(selectedDate),
                )}
                {habitSection(
                  t(lang, "habitsSectionPolite4s"),
                  ["give_greetings", "smile_greet_polite"],
                  isFuture(selectedDate),
                  t(lang, "habitsSectionPolite4sHint"),
                )}

                <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-3">
                  <h3 className="font-bold text-slate-700">{t(lang, "habitsOnTimeTitle")}</h3>
                  <p className="text-xs text-slate-500 -mt-1">{t(lang, "habitsOnTimeHint")}</p>
                  {onTimeControl}
                </div>

                {habitSection(
                  t(lang, "habitsSectionHelpChores"),
                  ["help_parents"],
                  isFuture(selectedDate),
                )}
                {habitSection(
                  t(lang, "habitsSectionParentHugPray"),
                  ["parent_hug_pray"],
                  isFuture(selectedDate),
                )}
                {habitSection(
                  t(lang, "habitsSectionChildStory"),
                  ["child_tell_parents"],
                  isFuture(selectedDate),
                )}

                <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-2">
                  <label className="font-semibold text-slate-700 text-sm" htmlFor="quran-juz">
                    {t(lang, "habitsQuranJuzLabel")}
                  </label>
                  <p className="text-xs text-slate-500">{t(lang, "habitsQuranJuzHint")}</p>
                  <textarea
                    id="quran-juz"
                    rows={2}
                    disabled={isFuture(selectedDate)}
                    placeholder={t(lang, "habitsQuranJuzPlaceholder")}
                    value={payload.quranJuzInfo ?? ""}
                    onChange={(e) =>
                      setPayload((p) => ({
                        ...p,
                        quranJuzInfo: e.target.value.trim() ? e.target.value : null,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 p-3 text-sm disabled:opacity-40"
                  />
                </div>

                <div className="sticky bottom-0 -mx-4 px-4 pt-3 pb-2 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent border-t border-slate-100/80">
                  <button
                    type="button"
                    disabled={
                      !isDirty ||
                      loadingDay ||
                      isFuture(selectedDate) ||
                      !habitsCanSave ||
                      saveState === "saving"
                    }
                    onClick={() => setSaveConfirmOpen(true)}
                    className={[
                      "w-full py-3.5 rounded-2xl font-bold text-sm shadow-md",
                      isDirty && habitsCanSave && !isFuture(selectedDate) && !loadingDay
                        ? "bg-primary text-white shadow-primary/25"
                        : "bg-slate-200 text-slate-400",
                    ].join(" ")}
                  >
                    {t(lang, "habitsSaveButton")}
                  </button>
                </div>
              </>
            )}
          </div>
        ) : null}

        {tab === "summary" && activeChildId ? (
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-100 p-2">
              <button
                type="button"
                aria-label={t(lang, "habitsPrevMonth")}
                onClick={() => shiftMonth(-1)}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-600"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="font-bold text-slate-800 capitalize text-sm">{monthTitle}</span>
              <button
                type="button"
                aria-label={t(lang, "habitsNextMonth")}
                onClick={() => shiftMonth(1)}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-600"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {loadingSummary ? (
              <p className="text-center text-sm text-slate-400 py-8">…</p>
            ) : !summary || summary.totalDays === 0 ? (
              <p className="text-center text-sm text-slate-500 py-6">{t(lang, "habitsEmptySummary")}</p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                    <p className="text-xs text-slate-500 font-medium">{t(lang, "habitsSummaryDays")}</p>
                    <p className="text-2xl font-black text-slate-800">{summary.totalDays}</p>
                  </div>
                  <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                    <p className="text-xs text-slate-500 font-medium">{t(lang, "habitsSummaryAvg")}</p>
                    <p className="text-2xl font-black text-primary">{summary.avgScorePct}%</p>
                  </div>
                </div>

                <div className="bg-primary rounded-3xl p-5 text-white shadow-lg shadow-primary/25">
                  <div className="flex items-center gap-2 font-bold text-sm mb-4">
                    <BarChart2 size={18} /> {lang === "en" ? "Categories" : "Kategori"}
                  </div>
                  <div className="space-y-3">
                    {(
                      [
                        ["habitsCategoryIbadah", summary.ibadahPct] as const,
                        ["habitsCategoryDisiplin", summary.disiplinPct] as const,
                        ["habitsCategoryKarakter", summary.karakterPct] as const,
                      ] as const
                    ).map(([labelKey, pct]) => (
                      <div key={labelKey}>
                        <div className="flex justify-between text-xs text-white/90 mb-1">
                          <span>{t(lang, labelKey)}</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="w-full bg-white/20 rounded-full h-2">
                          <div className="bg-white h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm">
                  <p className="font-bold text-slate-700 text-sm mb-2">{t(lang, "habitsTrendTitle")}</p>
                  <TrendChart points={summary.dailyTrend} lang={lang} />
                </div>

                <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm space-y-3">
                  <p className="font-bold text-slate-700 text-sm">{t(lang, "habitsItemConsistency")}</p>
                  {summary.itemRates.map(({ key, pct }) => (
                    <div key={key}>
                      <div className="flex justify-between text-xs text-slate-600 mb-1">
                        <span>{t(lang, HABIT_ROW_LABEL_KEY[key])}</span>
                        <span className="font-bold">{pct}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : null}
      </div>

      {saveConfirmOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center p-4 bg-black/45"
          role="presentation"
          onClick={() => setSaveConfirmOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="habits-save-confirm-title"
            className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-xl border border-slate-100 mb-2 sm:mb-0"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="habits-save-confirm-title" className="text-lg font-black text-slate-800">
              {t(lang, "habitsConfirmSaveTitle")}
            </h2>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              {t(lang, "habitsConfirmSaveMessage")}
            </p>
            <p className="text-xs font-bold text-slate-500 mt-2">
              {new Date(`${selectedDate}T12:00:00`).toLocaleDateString(lang === "id" ? "id-ID" : "en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
            <div className="flex gap-2 mt-5">
              <button
                type="button"
                className="flex-1 py-3 rounded-2xl font-bold text-sm border border-slate-200 text-slate-700 bg-white hover:bg-slate-50"
                onClick={() => setSaveConfirmOpen(false)}
              >
                {t(lang, "habitsConfirmSaveCancel")}
              </button>
              <button
                type="button"
                disabled={saveState === "saving"}
                className="flex-1 py-3 rounded-2xl font-bold text-sm bg-primary text-white disabled:opacity-60"
                onClick={async () => {
                  const ok = await performSave();
                  if (ok) setSaveConfirmOpen(false);
                }}
              >
                {saveState === "saving" ? t(lang, "habitsSaving") : t(lang, "habitsConfirmSaveSubmit")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
