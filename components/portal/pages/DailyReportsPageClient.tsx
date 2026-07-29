"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Header } from "@/components/portal/Header";
import { ChildSelector } from "@/components/portal/ChildSelector";
import { useActiveChild, usePortalState } from "@/components/portal/state/PortalProvider";
import {
  PortalMonthCalendar,
  monthRangeISO,
  todayISO,
} from "@/components/portal/shared/PortalMonthCalendar";
import { DailyReportReadView } from "@/components/portal/daily-reports/DailyReportReadView";
import { ParentCornerSection } from "@/components/portal/daily-reports/ParentCornerSection";
import {
  DailyReportsDaySkeleton,
  DailyReportsSummarySkeleton,
} from "@/components/portal/habits/HabitsLoadingSkeleton";
import type {
  DailyReportCalendarDay,
  DailyReportFull,
  DailyReportHomeworkItem,
  DailyReportParentPatch,
  DailyReportSubjectHistoryItem,
  DailyReportSubjectOption,
  DailyReportSummaryResponse,
} from "@/lib/portal/daily-reports-shared";
import { MOOD_EMOJI, MOOD_KEYS } from "@/lib/portal/daily-reports-shared";
import { isPrimaryStudent } from "@/lib/portal/is-kindergarten";
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

const ATL_LABELS: Record<string, string> = {
  thinking: "Thinking",
  social: "Social",
  communication: "Communication",
  self_management: "Self-management",
  research: "Research",
};

function moodLabel(mood: string, lang: Lang): string {
  const key = MOOD_KEYS[mood as keyof typeof MOOD_KEYS];
  return key ? t(lang, key) : mood;
}

function subjectDisplayName(
  name: string,
  nameId: string | null,
  lang: Lang,
): string {
  if (lang === "id" && nameId) return nameId;
  return name;
}

export function DailyReportsPageClient() {
  const { lang, activeChildId } = usePortalState();
  const activeChild = useActiveChild();
  const isPrimaryChild = isPrimaryStudent(activeChild ?? {});

  const [tab, setTab] = useState<"daily" | "summary" | "bySubject">("daily");
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
  const [homework, setHomework] = useState<DailyReportHomeworkItem[]>([]);
  const [subjectOptions, setSubjectOptions] = useState<DailyReportSubjectOption[]>([]);
  const [selectedLaId, setSelectedLaId] = useState<number | null>(null);
  const [subjectHistory, setSubjectHistory] = useState<DailyReportSubjectHistoryItem[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [dateReady, setDateReady] = useState(false);
  const refreshingAllRef = useRef(false);
  const autoSelectedKeyRef = useRef<string | null>(null);
  const calAbortRef = useRef<AbortController | null>(null);
  const dayAbortRef = useRef<AbortController | null>(null);

  const loadCalendar = useCallback(async () => {
    if (!activeChildId) {
      setCalendarDays([]);
      setDateReady(false);
      return;
    }
    calAbortRef.current?.abort();
    const ac = new AbortController();
    calAbortRef.current = ac;
    setLoadingCal(true);
    try {
      const params = new URLSearchParams({
        studentId: String(activeChildId),
        year: String(calYear),
        month: String(calMonth0 + 1),
      });
      const res = await fetch(`/api/portal/daily-reports/calendar?${params}`, {
        signal: ac.signal,
      });
      if (!res.ok) {
        setCalendarDays([]);
        setDateReady(true);
        return;
      }
      const data = (await res.json()) as {
        days?: DailyReportCalendarDay[];
        suggestedDate?: string;
      };
      const days = Array.isArray(data.days) ? data.days : [];
      setCalendarDays(days);

      const key = `${activeChildId}-${calYear}-${calMonth0}`;
      if (autoSelectedKeyRef.current !== key) {
        autoSelectedKeyRef.current = key;
        const next =
          typeof data.suggestedDate === "string" && data.suggestedDate
            ? data.suggestedDate
            : todayISO();
        setSelectedDate(next);
      }
      setDateReady(true);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setCalendarDays([]);
      setDateReady(true);
    } finally {
      if (!ac.signal.aborted) setLoadingCal(false);
    }
  }, [activeChildId, calYear, calMonth0]);

  const loadDay = useCallback(async () => {
    if (!activeChildId || !dateReady) return;
    dayAbortRef.current?.abort();
    const ac = new AbortController();
    dayAbortRef.current = ac;
    setLoadingDay(true);
    try {
      const params = new URLSearchParams({
        studentId: String(activeChildId),
        date: selectedDate,
      });
      const res = await fetch(`/api/portal/daily-reports/day?${params}`, {
        signal: ac.signal,
      });
      if (!res.ok) {
        setReport(null);
        return;
      }
      const data = (await res.json()) as { report: DailyReportFull | null };
      setReport(data.report ?? null);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setReport(null);
    } finally {
      if (!ac.signal.aborted) setLoadingDay(false);
    }
  }, [activeChildId, selectedDate, dateReady]);

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

  const loadHomework = useCallback(async () => {
    if (!activeChildId || !isPrimaryChild) {
      setHomework([]);
      return;
    }
    const res = await fetch(
      `/api/portal/daily-reports/homework?studentId=${activeChildId}`,
    );
    if (!res.ok) {
      setHomework([]);
      return;
    }
    const data = (await res.json()) as { items?: DailyReportHomeworkItem[] };
    setHomework(Array.isArray(data.items) ? data.items : []);
  }, [activeChildId, isPrimaryChild]);

  const loadSubjectOptions = useCallback(async () => {
    if (!activeChildId) {
      setSubjectOptions([]);
      setSelectedLaId(null);
      return;
    }
    setLoadingSubjects(true);
    try {
      const res = await fetch(
        `/api/portal/daily-reports/subjects?studentId=${activeChildId}`,
      );
      if (!res.ok) {
        setSubjectOptions([]);
        setSelectedLaId(null);
        return;
      }
      const data = (await res.json()) as { subjects?: DailyReportSubjectOption[] };
      const list = Array.isArray(data.subjects) ? data.subjects : [];
      setSubjectOptions(list);
      setSelectedLaId((prev) =>
        prev && list.some((s) => s.learningAreaId === prev)
          ? prev
          : list[0]?.learningAreaId ?? null,
      );
    } finally {
      setLoadingSubjects(false);
    }
  }, [activeChildId]);

  const loadSubjectHistory = useCallback(async () => {
    if (!activeChildId || !selectedLaId) {
      setSubjectHistory([]);
      return;
    }
    setLoadingHistory(true);
    try {
      const params = new URLSearchParams({
        studentId: String(activeChildId),
        learningAreaId: String(selectedLaId),
      });
      const res = await fetch(`/api/portal/daily-reports/subjects/history?${params}`);
      if (!res.ok) {
        setSubjectHistory([]);
        return;
      }
      const data = (await res.json()) as { items?: DailyReportSubjectHistoryItem[] };
      setSubjectHistory(Array.isArray(data.items) ? data.items : []);
    } finally {
      setLoadingHistory(false);
    }
  }, [activeChildId, selectedLaId]);

  useEffect(() => {
    autoSelectedKeyRef.current = null;
    setDateReady(false);
    setSelectedDate(todayISO());
    setReport(null);
    setHomework([]);
  }, [activeChildId]);

  useEffect(() => {
    void loadCalendar();
  }, [loadCalendar]);

  useEffect(() => {
    void loadDay();
  }, [loadDay]);

  useEffect(() => {
    if (isPrimaryChild) void loadHomework();
    else setHomework([]);
  }, [loadHomework, isPrimaryChild]);

  useEffect(() => {
    if (tab === "bySubject" && !isPrimaryChild && report?.schoolLevel !== "primary") {
      setTab("daily");
    }
  }, [tab, isPrimaryChild, report?.schoolLevel]);

  useEffect(() => {
    if (tab === "summary") void loadSummary();
  }, [tab, loadSummary]);

  useEffect(() => {
    if (tab === "bySubject") void loadSubjectOptions();
  }, [tab, loadSubjectOptions]);

  useEffect(() => {
    if (tab === "bySubject") void loadSubjectHistory();
  }, [tab, loadSubjectHistory]);

  const refreshAll = useCallback(async () => {
    if (!activeChildId || refreshingAllRef.current) return;
    refreshingAllRef.current = true;
    setRefreshingAll(true);
    try {
      const tasks: Promise<unknown>[] = [loadCalendar(), loadDay()];
      if (isPrimaryChild) tasks.push(loadHomework());
      if (tab === "summary") tasks.push(loadSummary());
      if (tab === "bySubject") {
        tasks.push(loadSubjectOptions());
      }
      await Promise.all(tasks);
      if (tab === "bySubject") await loadSubjectHistory();
    } finally {
      refreshingAllRef.current = false;
      setRefreshingAll(false);
    }
  }, [
    activeChildId,
    isPrimaryChild,
    tab,
    loadCalendar,
    loadDay,
    loadHomework,
    loadSummary,
    loadSubjectOptions,
    loadSubjectHistory,
  ]);

  const applyParentPatch = useCallback(
    (patch: DailyReportParentPatch) => {
      setReport((prev) => (prev ? { ...prev, ...patch } : prev));
      void loadCalendar();
    },
    [loadCalendar],
  );

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
  const showBySubject = isPrimaryChild || report?.schoolLevel === "primary";

  return (
    <div className="min-h-screen bg-slate-50 pb-6">
      <Header
        title={t(lang, "dailyReports")}
        backHref="/"
        rightSlot={
          <button
            type="button"
            onClick={() => void refreshAll()}
            disabled={!activeChildId || refreshingAll}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold text-primary hover:bg-primary/5 disabled:opacity-50 disabled:pointer-events-none transition-colors"
            aria-label={t(lang, "drRefreshAll")}
            title={t(lang, "drRefreshAll")}
          >
            <RefreshCw
              size={16}
              className={refreshingAll ? "animate-spin" : undefined}
              aria-hidden
            />
            <span className="hidden sm:inline">{t(lang, "drRefreshAll")}</span>
          </button>
        }
      />
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
          {showBySubject ? (
            <button
              type="button"
              onClick={() => setTab("bySubject")}
              className={[
                "flex-1 py-2.5 rounded-xl font-bold text-sm",
                tab === "bySubject" ? "bg-primary text-white" : "bg-slate-100 text-slate-700",
              ].join(" ")}
            >
              {t(lang, "drBySubjectTab")}
            </button>
          ) : null}
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
            {homework.length > 0 ? (
              <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100">
                <h3 className="font-bold text-slate-800 text-sm mb-3">
                  📌 {t(lang, "drUpcomingHomework")}
                </h3>
                <ul className="space-y-3">
                  {homework.map((hw, i) => (
                    <li key={`${hw.subjectName}-${hw.homeworkDueDate}-${i}`} className="text-sm">
                      <p className="font-bold text-slate-900">
                        {subjectDisplayName(hw.subjectName, hw.subjectNameId, lang)}
                      </p>
                      <p className="text-slate-600 whitespace-pre-wrap mt-0.5">{hw.homework}</p>
                      <p className="text-xs text-amber-700 font-semibold mt-1">
                        📅 {hw.homeworkDueDate}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {/* Mobile: stacked · Desktop: calendar | report col | report col */}
            <div className="md:grid md:grid-cols-[280px_1fr] md:gap-4 md:items-start space-y-4 md:space-y-0">
              <div className="space-y-3 md:sticky md:top-20">
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
              </div>

              <div className="space-y-4 min-w-0">
                {loadingDay && !report ? (
                  <DailyReportsDaySkeleton />
                ) : isFuture ? null : !report ? (
                  <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 text-center">
                    <p className="text-sm text-slate-500">{t(lang, "drEmptyDay")}</p>
                  </div>
                ) : (
                  <div
                    className={[
                      "space-y-4",
                      loadingDay ? "opacity-70 transition-opacity" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <DailyReportReadView report={report} lang={lang} />
                    <ParentCornerSection
                      report={report}
                      lang={lang}
                      studentId={activeChildId}
                      selectedDate={selectedDate}
                      onUpdated={applyParentPatch}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {tab === "bySubject" && activeChildId ? (
          <div className="mt-4 space-y-4">
            <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm mb-3">
                {t(lang, "drBySubjectTitle")}
              </h3>
              {loadingSubjects ? (
                <p className="text-sm text-slate-400">…</p>
              ) : subjectOptions.length === 0 ? (
                <p className="text-sm text-slate-500">{t(lang, "drBySubjectNoSubjects")}</p>
              ) : (
                <select
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white"
                  value={selectedLaId ?? ""}
                  onChange={(e) =>
                    setSelectedLaId(e.target.value ? Number(e.target.value) : null)
                  }
                >
                  <option value="">{t(lang, "drBySubjectPick")}</option>
                  {subjectOptions.map((s) => (
                    <option key={s.learningAreaId} value={s.learningAreaId}>
                      {subjectDisplayName(s.name, s.nameId, lang)}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {loadingHistory ? (
              <p className="text-center text-sm text-slate-400 py-6">…</p>
            ) : !selectedLaId ? null : subjectHistory.length === 0 ? (
              <p className="text-center text-sm text-slate-500 py-4">
                {t(lang, "drBySubjectEmpty")}
              </p>
            ) : (
              <ul className="space-y-3">
                {subjectHistory.map((item, i) => (
                  <li
                    key={`${item.reportDate}-${i}`}
                    className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 space-y-2"
                  >
                    <p className="text-sm font-bold text-slate-900">{item.reportDate}</p>
                    {item.topic ? (
                      <p className="text-sm text-slate-700">
                        <span className="font-semibold">{t(lang, "drSubjectTopic")}: </span>
                        {item.topic}
                      </p>
                    ) : null}
                    {item.activities ? (
                      <p className="text-sm text-slate-600 whitespace-pre-wrap">
                        {item.activities}
                      </p>
                    ) : null}
                    {item.homeworkGiven && item.homework ? (
                      <p className="text-sm text-slate-700">
                        <span className="font-semibold">{t(lang, "drSubjectHomework")}: </span>
                        {item.homework}
                        {item.homeworkDueDate ? ` — ${item.homeworkDueDate}` : ""}
                      </p>
                    ) : null}
                    {item.atlSkills.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {item.atlSkills.map((sk) => (
                          <span
                            key={sk}
                            className="rounded-full bg-sky-50 text-sky-800 border border-sky-100 px-2 py-0.5 text-[11px] font-semibold"
                          >
                            {ATL_LABELS[sk] ?? sk}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {item.privateNote ? (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                        🔒 {item.privateNote}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {tab === "summary" && activeChildId ? (
          <div className="mt-4 md:grid md:grid-cols-[280px_1fr] md:gap-4 md:items-start space-y-4 md:space-y-0">
            <div className="space-y-3 md:sticky md:top-20">
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
            </div>

            <div className="min-w-0">
              {loadingSummary ? (
                <DailyReportsSummarySkeleton />
              ) : !summary || summary.daysReported === 0 ? (
                <p className="text-center text-sm text-slate-500 py-4">{t(lang, "drSummaryEmpty")}</p>
              ) : (
                <div className="space-y-4 md:space-y-0 md:columns-2 md:gap-4">
                  <div className="grid grid-cols-3 gap-2 break-inside-avoid md:mb-4 md:inline-block md:w-full md:grid-cols-1">
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
                    <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 break-inside-avoid md:mb-4 md:inline-block md:w-full">
                      <h3 className="font-bold text-slate-700 mb-4">{t(lang, "drSummaryLearningAreas")}</h3>
                      <ul className="space-y-3">
                        {summary.learningAreas.map((la) => (
                          <li key={la.name}>
                            <div className="flex justify-between text-xs font-medium text-slate-600 mb-1 gap-2">
                              <span className="min-w-0 truncate">
                                {lang === "id" && la.nameId ? la.nameId : la.name}
                              </span>
                              <span className="shrink-0">
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
                    <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 break-inside-avoid md:mb-4 md:inline-block md:w-full">
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
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
