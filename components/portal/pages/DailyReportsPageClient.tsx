"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Header } from "@/components/portal/Header";
import { ChildSelector } from "@/components/portal/ChildSelector";
import { usePortalState } from "@/components/portal/state/PortalProvider";
import {
  PortalMonthCalendar,
  monthRangeISO,
  todayISO,
} from "@/components/portal/shared/PortalMonthCalendar";
import { DailyReportReadView } from "@/components/portal/daily-reports/DailyReportReadView";
import { ParentCornerSection } from "@/components/portal/daily-reports/ParentCornerSection";
import type {
  DailyReportCalendarDay,
  DailyReportFull,
  DailyReportSummaryResponse,
} from "@/lib/portal/daily-reports-shared";
import { MOOD_EMOJI, MOOD_KEYS } from "@/lib/portal/daily-reports-shared";
import { t, type Lang } from "@/lib/i18n/translations";

const DR_LEGEND_KEYS = {
  title: "drCalLegendTitle" as const,
  selected: "drCalLegendSelected" as const,
  dot: "drCalLegendDot" as const,
  noDot: "drCalLegendNoDot" as const,
  future: "drCalLegendFuture" as const,
  dayTitleFuture: "drCalDayTitleFuture" as const,
  dayTitleHasData: "drCalDayTitleHasData" as const,
  dayTitleEmpty: "drCalDayTitleEmpty" as const,
  selectedBadge: "drCalSelectedBadge" as const,
  prevMonth: "habitsPrevMonth" as const,
  nextMonth: "habitsNextMonth" as const,
  futureDate: "drFutureDate" as const,
};

function moodLabel(mood: string, lang: Lang): string {
  const key = MOOD_KEYS[mood as keyof typeof MOOD_KEYS];
  return key ? t(lang, key) : mood;
}

export function DailyReportsPageClient() {
  const { lang, activeChildId } = usePortalState();
  const [tab, setTab] = useState<"daily" | "summary">("daily");
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth0, setCalMonth0] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState(todayISO);
  const [calendarDays, setCalendarDays] = useState<DailyReportCalendarDay[]>([]);
  const [report, setReport] = useState<DailyReportFull | null>(null);
  const [loadingCal, setLoadingCal] = useState(false);
  const [loadingDay, setLoadingDay] = useState(false);
  const [summary, setSummary] = useState<DailyReportSummaryResponse | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

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
      const res = await fetch(`/api/portal/daily-reports/calendar?${params}`);
      if (!res.ok) {
        setCalendarDays([]);
        return;
      }
      const data = (await res.json()) as { days?: DailyReportCalendarDay[] };
      setCalendarDays(Array.isArray(data.days) ? data.days : []);
    } finally {
      setLoadingCal(false);
    }
  }, [activeChildId, calYear, calMonth0]);

  const loadDay = useCallback(async () => {
    if (!activeChildId) {
      setReport(null);
      return;
    }
    setLoadingDay(true);
    try {
      const params = new URLSearchParams({
        studentId: String(activeChildId),
        date: selectedDate,
      });
      const res = await fetch(`/api/portal/daily-reports/day?${params}`);
      if (!res.ok) {
        setReport(null);
        return;
      }
      const data = (await res.json()) as { report: DailyReportFull | null };
      setReport(data.report ?? null);
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
      const res = await fetch(`/api/portal/daily-reports/summary?${params}`);
      if (!res.ok) {
        setSummary(null);
        return;
      }
      setSummary((await res.json()) as DailyReportSummaryResponse);
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

  const shiftMonth = (delta: number) => {
    const d = new Date(calYear, calMonth0 + delta, 1);
    setCalYear(d.getFullYear());
    setCalMonth0(d.getMonth());
  };

  const calendarEntries = useMemo(
    () => calendarDays.map((d) => ({ date: d.date, hasEntry: d.hasReport })),
    [calendarDays],
  );

  const isFuture = selectedDate > todayISO();

  return (
    <div className="min-h-screen bg-slate-50 pb-6">
      <Header title={t(lang, "dailyReports")} backHref="/" />
      <ChildSelector />
      <p className="px-4 text-center text-xs text-slate-500 -mt-1 mb-1">
        {t(lang, "dailyReportsSubtitle")}
      </p>

      <div className="px-4">
        {!activeChildId ? (
          <p className="text-center text-sm text-slate-500 mt-4">{t(lang, "drNoChild")}</p>
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
            <PortalMonthCalendar
              lang={lang}
              calYear={calYear}
              calMonth0={calMonth0}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              onShiftMonth={shiftMonth}
              days={calendarEntries}
              loading={loadingCal}
              todayISO={todayISO()}
              legendKeys={DR_LEGEND_KEYS}
            />

            {loadingDay ? (
              <p className="text-center text-sm text-slate-400 py-6">…</p>
            ) : isFuture ? null : !report ? (
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 text-center">
                <p className="text-sm text-slate-500">{t(lang, "drEmptyDay")}</p>
              </div>
            ) : (
              <>
                <DailyReportReadView report={report} lang={lang} />
                <ParentCornerSection
                  report={report}
                  lang={lang}
                  studentId={activeChildId}
                  selectedDate={selectedDate}
                  onUpdated={(next) => {
                    setReport(next);
                    void loadCalendar();
                    void loadSummary();
                  }}
                />
              </>
            )}
          </div>
        ) : null}

        {tab === "summary" && activeChildId ? (
          <div className="mt-4 space-y-4">
            <PortalMonthCalendar
              lang={lang}
              calYear={calYear}
              calMonth0={calMonth0}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              onShiftMonth={shiftMonth}
              days={calendarEntries}
              loading={loadingCal}
              todayISO={todayISO()}
              legendKeys={DR_LEGEND_KEYS}
              showFutureWarning={false}
            />

            {loadingSummary ? (
              <p className="text-center text-sm text-slate-400 py-6">…</p>
            ) : !summary || summary.daysReported === 0 ? (
              <p className="text-center text-sm text-slate-500 py-4">{t(lang, "drSummaryEmpty")}</p>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                      {t(lang, "drSummaryDays")}
                    </p>
                    <p className="text-2xl font-black text-slate-800 mt-1">{summary.daysReported}</p>
                  </div>
                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                      {t(lang, "drSummaryRead")}
                    </p>
                    <p className="text-2xl font-black text-slate-800 mt-1">{summary.daysReadByParent}</p>
                  </div>
                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                      {t(lang, "drSummaryReadRate")}
                    </p>
                    <p className="text-2xl font-black text-primary mt-1">{summary.readRatePct}%</p>
                  </div>
                </div>

                {summary.learningAreas.length > 0 ? (
                  <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-700 mb-4">{t(lang, "drSummaryLearningAreas")}</h3>
                    <ul className="space-y-3">
                      {summary.learningAreas.map((la) => (
                        <li key={la.name}>
                          <div className="flex justify-between text-xs font-medium text-slate-600 mb-1">
                            <span>{lang === "id" && la.nameId ? la.nameId : la.name}</span>
                            <span>
                              {la.avgRating.toFixed(1)} ★ ({la.totalObservations})
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{ width: `${Math.round((la.avgRating / 3) * 100)}%` }}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {summary.moods.length > 0 ? (
                  <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-700 mb-4">{t(lang, "drSummaryMoods")}</h3>
                    <ul className="space-y-2">
                      {summary.moods.map((m) => (
                        <li
                          key={m.mood}
                          className="flex items-center justify-between text-sm text-slate-600"
                        >
                          <span className="flex items-center gap-2">
                            <span aria-hidden>
                              {MOOD_EMOJI[m.mood as keyof typeof MOOD_EMOJI] ?? "•"}
                            </span>
                            {moodLabel(m.mood, lang)}
                          </span>
                          <span className="font-bold text-slate-800">{m.count}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
