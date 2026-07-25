"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Header } from "@/components/portal/Header";
import { ChildSelector } from "@/components/portal/ChildSelector";
import { usePortalState } from "@/components/portal/state/PortalProvider";
import {
  PortalMonthCalendar,
  monthRangeISO,
  todayISO,
} from "@/components/portal/shared/PortalMonthCalendar";
import {
  emptySecondaryDailyPayload,
  GOOD_DEED_TYPES,
  secondaryDailyScorePct,
  type EffortLevel,
  type GoodDeedType,
  type SecondaryDailyCalendarDay,
  type SecondaryDailyDayResponse,
  type SecondaryDailyPayload,
  type SecondaryDailySummaryResponse,
  type UnderstandingLevel,
} from "@/lib/portal/secondary-daily-shared";
import {
  emptySecondaryWeeklyPayload,
  type SecondaryWeeklyPayload,
  type SecondaryWeeklyResponse,
} from "@/lib/portal/secondary-weekly-shared";
import { t, type Lang, type TranslationKey } from "@/lib/i18n/translations";

const DEED_LABEL: Record<GoodDeedType, TranslationKey> = {
  helped_friend: "secDeedHelpedFriend",
  kept_clean: "secDeedKeptClean",
  spoke_truth: "secDeedSpokeTruth",
  showed_respect: "secDeedShowedRespect",
  avoided_backbiting: "secDeedAvoidedBackbiting",
  other: "secDeedOther",
};

const UNDERSTANDING: { value: UnderstandingLevel; key: TranslationKey }[] = [
  { value: "fully", key: "secUnderstandFully" },
  { value: "mostly", key: "secUnderstandMostly" },
  { value: "partially", key: "secUnderstandPartially" },
  { value: "need_help", key: "secUnderstandNeedHelp" },
];

const EFFORT: { value: EffortLevel; key: TranslationKey }[] = [
  { value: "maximum", key: "secEffortMaximum" },
  { value: "good", key: "secEffortGood" },
  { value: "could_do_more", key: "secEffortCouldDoMore" },
  { value: "needs_improvement", key: "secEffortNeedsImprovement" },
];

const ENERGY_KEYS: Record<1 | 2 | 3 | 4 | 5, TranslationKey> = {
  1: "secEnergy1",
  2: "secEnergy2",
  3: "secEnergy3",
  4: "secEnergy4",
  5: "secEnergy5",
};

function ToggleRow({
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

function PillGroup<T extends string>({
  options,
  selected,
  onSelect,
  disabled,
}: {
  options: { value: T; label: string }[];
  selected: T | null;
  onSelect: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(o.value)}
          className={[
            "px-3 py-2 rounded-xl text-xs font-semibold border",
            selected === o.value
              ? "bg-primary text-white border-primary"
              : "bg-white text-slate-600 border-slate-200",
            disabled ? "opacity-40" : "",
          ].join(" ")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SecondaryDailyPageClient() {
  const { lang, activeChildId } = usePortalState();
  const [tab, setTab] = useState<"daily" | "weekly" | "summary">("daily");
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth0, setCalMonth0] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState(todayISO);
  const [calendarDays, setCalendarDays] = useState<SecondaryDailyCalendarDay[]>([]);
  const [payload, setPayload] = useState<SecondaryDailyPayload>(emptySecondaryDailyPayload);
  const [sessionsMeta, setSessionsMeta] = useState<SecondaryDailyDayResponse["sessions"]>([]);
  const [loadingCal, setLoadingCal] = useState(false);
  const [loadingDay, setLoadingDay] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [summary, setSummary] = useState<SecondaryDailySummaryResponse | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [week, setWeek] = useState<SecondaryWeeklyResponse | null>(null);
  const [weekPayload, setWeekPayload] = useState<SecondaryWeeklyPayload>(emptySecondaryWeeklyPayload);
  const [loadingWeek, setLoadingWeek] = useState(false);
  const [weekSaveState, setWeekSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [weekConfirmOpen, setWeekConfirmOpen] = useState(false);
  const [parentName, setParentName] = useState("");
  const [parentConfirmed, setParentConfirmed] = useState(false);
  const lastHydratedJson = useRef("");

  const isFuture = selectedDate > todayISO();

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
      const res = await fetch(`/api/portal/secondary-daily/calendar?${params}`);
      if (!res.ok) {
        setCalendarDays([]);
        return;
      }
      const data = (await res.json()) as { days?: SecondaryDailyCalendarDay[] };
      setCalendarDays(Array.isArray(data.days) ? data.days : []);
    } finally {
      setLoadingCal(false);
    }
  }, [activeChildId, calYear, calMonth0]);

  const loadDay = useCallback(async () => {
    if (!activeChildId) return;
    setLoadingDay(true);
    try {
      const params = new URLSearchParams({
        studentId: String(activeChildId),
        date: selectedDate,
      });
      const res = await fetch(`/api/portal/secondary-daily/day?${params}`);
      if (!res.ok) {
        setPayload(emptySecondaryDailyPayload());
        setSessionsMeta([]);
        lastHydratedJson.current = "";
        return;
      }
      const data = (await res.json()) as { day?: SecondaryDailyDayResponse };
      const day = data.day;
      if (!day) return;
      setPayload(day.payload);
      setSessionsMeta(day.sessions);
      lastHydratedJson.current = JSON.stringify(day.payload);
    } finally {
      setLoadingDay(false);
    }
  }, [activeChildId, selectedDate]);

  const loadSummary = useCallback(async () => {
    if (!activeChildId) {
      setSummary(null);
      return;
    }
    setLoadingSummary(true);
    try {
      const { from, to } = monthRangeISO(calYear, calMonth0);
      const params = new URLSearchParams({
        studentId: String(activeChildId),
        from,
        to,
      });
      const res = await fetch(`/api/portal/secondary-daily/summary?${params}`);
      if (!res.ok) {
        setSummary(null);
        return;
      }
      setSummary((await res.json()) as SecondaryDailySummaryResponse);
    } finally {
      setLoadingSummary(false);
    }
  }, [activeChildId, calYear, calMonth0]);

  const loadWeek = useCallback(async () => {
    if (!activeChildId) {
      setWeek(null);
      return;
    }
    setLoadingWeek(true);
    try {
      const params = new URLSearchParams({
        studentId: String(activeChildId),
        date: selectedDate,
      });
      const res = await fetch(`/api/portal/secondary-weekly/week?${params}`);
      if (!res.ok) {
        setWeek(null);
        return;
      }
      const data = (await res.json()) as { week?: SecondaryWeeklyResponse | null };
      if (!data.week) {
        setWeek(null);
        setWeekPayload(emptySecondaryWeeklyPayload());
        setParentConfirmed(false);
        setParentName("");
        return;
      }
      setWeek(data.week);
      setWeekPayload(data.week.payload);
      setParentConfirmed(data.week.parentIbadahConfirmed);
      setParentName(data.week.parentIbadahName ?? "");
    } finally {
      setLoadingWeek(false);
    }
  }, [activeChildId, selectedDate]);

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
    if (tab === "weekly") void loadWeek();
  }, [tab, loadWeek]);

  const isDirty = useMemo(
    () => JSON.stringify(payload) !== lastHydratedJson.current,
    [payload],
  );

  const scorePct = useMemo(() => secondaryDailyScorePct(payload), [payload]);

  const performSave = useCallback(async () => {
    if (!activeChildId || isFuture) return false;
    setSaveState("saving");
    try {
      const res = await fetch("/api/portal/secondary-daily/day", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: activeChildId, date: selectedDate, ...payload }),
      });
      if (!res.ok) {
        setSaveState("error");
        return false;
      }
      const data = (await res.json()) as { day?: SecondaryDailyDayResponse };
      if (data.day) {
        setPayload(data.day.payload);
        setSessionsMeta(data.day.sessions);
        lastHydratedJson.current = JSON.stringify(data.day.payload);
      }
      setSaveState("saved");
      void loadCalendar();
      void loadSummary();
      window.setTimeout(() => setSaveState("idle"), 1500);
      return true;
    } catch {
      setSaveState("error");
      return false;
    }
  }, [activeChildId, isFuture, selectedDate, payload, loadCalendar, loadSummary]);

  const performWeekSave = useCallback(
    async (submit: boolean) => {
      if (!activeChildId) return false;
      setWeekSaveState("saving");
      try {
        const res = await fetch("/api/portal/secondary-weekly/week", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId: activeChildId,
            date: selectedDate,
            submit,
            ...weekPayload,
          }),
        });
        if (!res.ok) {
          setWeekSaveState("error");
          return false;
        }
        const data = (await res.json()) as { week?: SecondaryWeeklyResponse };
        if (data.week) {
          setWeek(data.week);
          setWeekPayload(data.week.payload);
        }
        setWeekSaveState("saved");
        window.setTimeout(() => setWeekSaveState("idle"), 1500);
        return true;
      } catch {
        setWeekSaveState("error");
        return false;
      }
    },
    [activeChildId, selectedDate, weekPayload],
  );

  const saveParentConfirm = useCallback(async () => {
    if (!activeChildId || !week) return;
    const res = await fetch("/api/portal/secondary-weekly/parent-confirm", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: activeChildId,
        date: selectedDate,
        confirmed: parentConfirmed,
        parentName,
      }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as { week?: SecondaryWeeklyResponse };
    if (data.week) setWeek(data.week);
  }, [activeChildId, week, selectedDate, parentConfirmed, parentName]);

  const shiftMonth = (delta: number) => {
    const d = new Date(calYear, calMonth0 + delta, 1);
    setCalYear(d.getFullYear());
    setCalMonth0(d.getMonth());
  };

  const legendKeys = {
    title: "habitsCalLegendTitle" as const,
    selected: "habitsCalLegendSelected" as const,
    dot: "habitsCalLegendDot" as const,
    noDot: "habitsCalLegendNoDot" as const,
    future: "habitsCalLegendFuture" as const,
    dayTitleFuture: "habitsCalDayTitleFuture" as const,
    dayTitleHasData: "habitsCalDayTitleHasData" as const,
    dayTitleEmpty: "habitsCalDayTitleEmpty" as const,
    selectedBadge: "habitsCalSelectedBadge" as const,
    prevMonth: "habitsPrevMonth" as const,
    nextMonth: "habitsNextMonth" as const,
    futureDate: "secFutureDate" as const,
  };

  const toggleDeed = (deedType: GoodDeedType) => {
    setPayload((p) => {
      const exists = p.goodDeeds.some((d) => d.deedType === deedType);
      if (exists) {
        return { ...p, goodDeeds: p.goodDeeds.filter((d) => d.deedType !== deedType) };
      }
      return {
        ...p,
        goodDeeds: [...p.goodDeeds, { deedType, customDeed: null }],
      };
    });
  };

  const updateSession = (
    sessionId: number,
    patch: Partial<SecondaryDailyPayload["sessionReflections"][number]>,
  ) => {
    setPayload((p) => ({
      ...p,
      sessionReflections: p.sessionReflections.map((s) =>
        s.sessionId === sessionId ? { ...s, ...patch } : s,
      ),
    }));
  };

  const section = (title: string, children: React.ReactNode, hint?: string) => (
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-3">
      <h3 className="font-bold text-slate-700">{title}</h3>
      {hint ? <p className="text-xs text-slate-500 -mt-1 leading-relaxed">{hint}</p> : null}
      {children}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-6">
      <Header title={t(lang, "habits")} backHref="/" />
      <ChildSelector />
      <p className="px-4 text-center text-xs text-slate-500 -mt-1 mb-1">{t(lang, "secDailySubtitle")}</p>

      <div className="px-4">
        {!activeChildId ? (
          <p className="text-center text-sm text-slate-500 mt-4">{t(lang, "secNoChild")}</p>
        ) : null}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-2 flex gap-2 mt-2">
          {(
            [
              ["daily", "secDailyTab"],
              ["weekly", "secWeeklyTab"],
              ["summary", "secSummaryTab"],
            ] as const
          ).map(([id, key]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={[
                "flex-1 py-2.5 rounded-xl font-bold text-sm",
                tab === id ? "bg-primary text-white" : "bg-slate-100 text-slate-700",
              ].join(" ")}
            >
              {t(lang, key)}
            </button>
          ))}
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
              days={calendarDays.map((d) => ({ date: d.date, hasEntry: d.hasEntry }))}
              loading={loadingCal}
              todayISO={todayISO()}
              legendKeys={legendKeys}
            />

            <div className="flex items-center justify-between px-1">
              <div>
                <p className="text-xs text-slate-500">{t(lang, "secScoreLabel")}</p>
                <p className="text-2xl font-black text-slate-800">{scorePct}%</p>
                <p className="text-[11px] text-slate-400 mt-1">{t(lang, "secSaveHint")}</p>
              </div>
              <div className="text-xs font-bold text-right text-slate-500">
                {saveState === "saving" ? t(lang, "secSaving") : null}
                {saveState === "saved" ? t(lang, "secSaved") : null}
                {saveState === "error" ? t(lang, "secSaveError") : null}
              </div>
            </div>

            {loadingDay ? (
              <p className="text-center text-sm text-slate-400 py-6">…</p>
            ) : (
              <div className="space-y-4">
                {section(
                  t(lang, "secSectionWajib"),
                  <div className="space-y-2">
                    {(
                      [
                        ["fajrPrayer", "secFajr"],
                        ["asrPrayer", "secAsr"],
                        ["maghribPrayer", "secMaghrib"],
                        ["ishaPrayer", "secIsha"],
                      ] as const
                    ).map(([key, labelKey]) => (
                      <ToggleRow
                        key={key}
                        checked={payload[key]}
                        label={t(lang, labelKey)}
                        disabled={isFuture}
                        onToggle={() => setPayload((p) => ({ ...p, [key]: !p[key] }))}
                      />
                    ))}
                    <div className="pt-2 space-y-2">
                      <p className="text-xs font-bold text-slate-500 uppercase">{t(lang, "secDhuha")}</p>
                      <PillGroup
                        disabled={isFuture}
                        selected={payload.dhuhaPrayer}
                        onSelect={(v) => setPayload((p) => ({ ...p, dhuhaPrayer: v }))}
                        options={[
                          { value: "yes", label: t(lang, "secDhuhaYes") },
                          { value: "no", label: t(lang, "secDhuhaNo") },
                        ]}
                      />
                    </div>
                    <div className="pt-2 space-y-2">
                      <p className="text-xs font-bold text-slate-500 uppercase">{t(lang, "secZuhur")}</p>
                      <PillGroup
                        disabled={isFuture}
                        selected={payload.zuhurPrayer}
                        onSelect={(v) => setPayload((p) => ({ ...p, zuhurPrayer: v }))}
                        options={[
                          { value: "well_done", label: t(lang, "secZuhurWellDone") },
                          { value: "needs_guidance", label: t(lang, "secZuhurNeedsGuidance") },
                          { value: "did_not_pray", label: t(lang, "secZuhurDidNotPray") },
                        ]}
                      />
                    </div>
                  </div>,
                )}

                {section(
                  t(lang, "secSectionSunnah"),
                  <div className="space-y-2">
                    {(
                      [
                        ["tahajudPrayer", "secTahajud"],
                        ["morningDhikr", "secMorningDhikr"],
                        ["eveningDhikr", "secEveningDhikr"],
                      ] as const
                    ).map(([key, labelKey]) => (
                      <ToggleRow
                        key={key}
                        checked={payload[key]}
                        label={t(lang, labelKey)}
                        disabled={isFuture}
                        onToggle={() => setPayload((p) => ({ ...p, [key]: !p[key] }))}
                      />
                    ))}
                  </div>,
                )}

                {section(
                  t(lang, "secSectionTilawah"),
                  <div className="space-y-2">
                    <ToggleRow
                      checked={payload.tilawahDone}
                      label={t(lang, "secTilawahDone")}
                      disabled={isFuture}
                      onToggle={() => setPayload((p) => ({ ...p, tilawahDone: !p.tilawahDone }))}
                    />
                    <ToggleRow
                      checked={payload.memorisationDone}
                      label={t(lang, "secMemorisationDone")}
                      disabled={isFuture}
                      onToggle={() =>
                        setPayload((p) => ({ ...p, memorisationDone: !p.memorisationDone }))
                      }
                    />
                  </div>,
                )}

                {section(
                  t(lang, "secSectionEnergy"),
                  <div className="grid grid-cols-5 gap-1.5">
                    {([1, 2, 3, 4, 5] as const).map((n) => (
                      <button
                        key={n}
                        type="button"
                        disabled={isFuture}
                        onClick={() => setPayload((p) => ({ ...p, energyLevel: n }))}
                        className={[
                          "flex flex-col items-center justify-center px-1 py-2 rounded-2xl border text-center",
                          payload.energyLevel === n
                            ? "bg-primary/10 border-primary text-primary"
                            : "bg-white border-slate-200 text-slate-500",
                          isFuture ? "opacity-40" : "",
                        ].join(" ")}
                      >
                        <span className="text-lg font-black">{n}</span>
                        <span className="text-[8px] font-bold uppercase leading-tight mt-0.5">
                          {t(lang, ENERGY_KEYS[n])}
                        </span>
                      </button>
                    ))}
                  </div>,
                )}

                {section(
                  t(lang, "secSectionDeeds"),
                  <div className="space-y-2">
                    {GOOD_DEED_TYPES.map((deedType) => {
                      const selected = payload.goodDeeds.some((d) => d.deedType === deedType);
                      return (
                        <div key={deedType}>
                          <ToggleRow
                            checked={selected}
                            label={t(lang, DEED_LABEL[deedType])}
                            disabled={isFuture}
                            onToggle={() => toggleDeed(deedType)}
                          />
                          {deedType === "other" && selected ? (
                            <input
                              type="text"
                              disabled={isFuture}
                              placeholder={t(lang, "secDeedOtherPlaceholder")}
                              value={
                                payload.goodDeeds.find((d) => d.deedType === "other")?.customDeed ??
                                ""
                              }
                              onChange={(e) =>
                                setPayload((p) => ({
                                  ...p,
                                  goodDeeds: p.goodDeeds.map((d) =>
                                    d.deedType === "other"
                                      ? { ...d, customDeed: e.target.value || null }
                                      : d,
                                  ),
                                }))
                              }
                              className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm"
                            />
                          ) : null}
                        </div>
                      );
                    })}
                  </div>,
                )}

                {section(
                  t(lang, "secSectionSessions"),
                  sessionsMeta.length === 0 ? (
                    <p className="text-sm text-slate-500">{t(lang, "secSessionsEmpty")}</p>
                  ) : (
                    <ul className="space-y-4">
                      {payload.sessionReflections.map((s) => {
                        const meta = sessionsMeta.find((m) => m.sessionId === s.sessionId);
                        return (
                          <li
                            key={s.sessionId}
                            className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-3"
                          >
                            <div>
                              <p className="font-bold text-slate-800 text-sm">{s.subjectName}</p>
                              <p className="text-xs text-slate-500">{meta?.title}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-slate-500 uppercase">
                                {t(lang, "secUnderstanding")}
                              </p>
                              <PillGroup
                                disabled={isFuture}
                                selected={s.understanding}
                                onSelect={(v) => updateSession(s.sessionId, { understanding: v })}
                                options={UNDERSTANDING.map((o) => ({
                                  value: o.value,
                                  label: t(lang, o.key),
                                }))}
                              />
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-slate-500 uppercase">
                                {t(lang, "secEffort")}
                              </p>
                              <PillGroup
                                disabled={isFuture}
                                selected={s.effort}
                                onSelect={(v) => updateSession(s.sessionId, { effort: v })}
                                options={EFFORT.map((o) => ({
                                  value: o.value,
                                  label: t(lang, o.key),
                                }))}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-slate-500 uppercase">
                                {t(lang, "secQuickNote")}
                              </label>
                              <textarea
                                rows={2}
                                disabled={isFuture}
                                placeholder={t(lang, "secQuickNotePlaceholder")}
                                value={s.quickNote ?? ""}
                                onChange={(e) =>
                                  updateSession(s.sessionId, {
                                    quickNote: e.target.value || null,
                                  })
                                }
                                className="w-full rounded-xl border border-slate-200 p-3 text-sm bg-white"
                              />
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ),
                  t(lang, "secSessionsHint"),
                )}

                <div className="sticky bottom-0 -mx-4 px-4 pt-3 pb-2 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent">
                  <button
                    type="button"
                    disabled={!isDirty || loadingDay || isFuture || saveState === "saving"}
                    onClick={() => setSaveConfirmOpen(true)}
                    className={[
                      "w-full py-3.5 rounded-2xl font-bold text-sm shadow-md",
                      isDirty && !isFuture && !loadingDay
                        ? "bg-primary text-white shadow-primary/25"
                        : "bg-slate-200 text-slate-400",
                    ].join(" ")}
                  >
                    {t(lang, "secSaveButton")}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {tab === "weekly" && activeChildId ? (
          <div className="mt-4 space-y-4">
            <PortalMonthCalendar
              lang={lang}
              calYear={calYear}
              calMonth0={calMonth0}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              onShiftMonth={shiftMonth}
              days={calendarDays.map((d) => ({ date: d.date, hasEntry: d.hasEntry }))}
              loading={loadingCal}
              todayISO={todayISO()}
              legendKeys={legendKeys}
              showFutureWarning={false}
            />

            {loadingWeek ? (
              <p className="text-center text-sm text-slate-400 py-6">…</p>
            ) : !week ? (
              <p className="text-center text-sm text-slate-500 py-4">{t(lang, "secWeeklyEmpty")}</p>
            ) : (
              <>
                <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                  <p className="font-bold text-slate-800">
                    {week.weekLabel || `${week.dateFrom} – ${week.dateTo}`}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {week.dateFrom} → {week.dateTo}
                    {week.status ? ` · ${week.status}` : ""}
                  </p>
                </div>

                <div className="bg-primary rounded-3xl p-5 text-white shadow-lg shadow-primary/25 space-y-3">
                  <p className="font-bold text-sm">{t(lang, "secWeeklyStatsTitle")}</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-white/80 text-xs">{t(lang, "secWeeklyPrayers")}</p>
                      <p className="font-black text-lg">
                        {week.stats.totalObligatoryPrayers}/{week.stats.maxObligatoryPrayers}
                      </p>
                    </div>
                    <div>
                      <p className="text-white/80 text-xs">{t(lang, "secWeeklyDhuha")}</p>
                      <p className="font-black text-lg">{week.stats.daysWithDhuha}</p>
                    </div>
                    <div>
                      <p className="text-white/80 text-xs">{t(lang, "secWeeklyTilawah")}</p>
                      <p className="font-black text-lg">{week.stats.daysWithTilawah}</p>
                    </div>
                    <div>
                      <p className="text-white/80 text-xs">{t(lang, "secWeeklyDhikr")}</p>
                      <p className="font-black text-lg">{week.stats.daysWithDhikr}</p>
                    </div>
                  </div>
                </div>

                {(
                  [
                    ["akhlaqReflection", "secWeeklyAkhlaq", "secWeeklyAkhlaqHint"],
                    ["bestLearningMoment", "secWeeklyBest", null],
                    ["mostChallenging", "secWeeklyChallenging", null],
                    ["unansweredQuestion", "secWeeklyQuestion", null],
                    ["weeklyGoal", "secWeeklyGoal", null],
                    ["messageToHomeroom", "secWeeklyMessage", null],
                  ] as const
                ).map(([field, labelKey, hintKey]) => (
                  <div
                    key={field}
                    className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-2"
                  >
                    <label className="font-bold text-slate-700 text-sm">{t(lang, labelKey)}</label>
                    {hintKey ? (
                      <p className="text-xs text-slate-500">{t(lang, hintKey)}</p>
                    ) : null}
                    <textarea
                      rows={3}
                      value={weekPayload[field] ?? ""}
                      onChange={(e) =>
                        setWeekPayload((p) => ({
                          ...p,
                          [field]: e.target.value || null,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 p-3 text-sm"
                    />
                  </div>
                ))}

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={weekSaveState === "saving"}
                    onClick={() => void performWeekSave(false)}
                    className="flex-1 py-3 rounded-2xl font-bold text-sm border-2 border-primary text-primary bg-white"
                  >
                    {t(lang, "secWeeklySaveDraft")}
                  </button>
                  <button
                    type="button"
                    disabled={weekSaveState === "saving"}
                    onClick={() => setWeekConfirmOpen(true)}
                    className="flex-1 py-3 rounded-2xl font-bold text-sm bg-primary text-white"
                  >
                    {t(lang, "secWeeklySubmit")}
                  </button>
                </div>
                <p className="text-center text-xs text-slate-500">
                  {weekSaveState === "saving" ? t(lang, "secSaving") : null}
                  {weekSaveState === "saved" ? t(lang, "secSaved") : null}
                  {weekSaveState === "error" ? t(lang, "secSaveError") : null}
                </p>

                <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={parentConfirmed}
                      onChange={(e) => setParentConfirmed(e.target.checked)}
                      className="h-5 w-5 rounded border-slate-300 text-primary"
                    />
                    <span className="text-sm font-semibold text-slate-700">
                      {t(lang, "secParentConfirm")}
                    </span>
                  </label>
                  <input
                    type="text"
                    placeholder={t(lang, "secParentNamePlaceholder")}
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-3 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => void saveParentConfirm()}
                    className="w-full py-3 rounded-2xl font-bold text-sm bg-emerald-600 text-white"
                  >
                    {week?.parentIbadahConfirmed
                      ? t(lang, "secParentConfirmed")
                      : t(lang, "secParentConfirmSave")}
                  </button>
                </div>
              </>
            )}
          </div>
        ) : null}

        {tab === "summary" && activeChildId ? (
          <div className="mt-4 space-y-4">
            {loadingSummary ? (
              <p className="text-center text-sm text-slate-400 py-6">…</p>
            ) : !summary || summary.totalDays === 0 ? (
              <p className="text-center text-sm text-slate-500 py-4">{t(lang, "secSummaryEmpty")}</p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard label={t(lang, "secSummaryDays")} value={String(summary.totalDays)} />
                  <StatCard label={t(lang, "secSummaryAvg")} value={`${summary.avgScorePct}%`} />
                  <StatCard label={t(lang, "secSummaryPrayer")} value={`${summary.prayerPct}%`} />
                  <StatCard
                    label={t(lang, "secSummaryEnergy")}
                    value={summary.avgEnergy != null ? String(summary.avgEnergy) : "—"}
                  />
                  <StatCard label={t(lang, "secSummaryDeeds")} value={String(summary.goodDeedCount)} />
                  <StatCard
                    label={t(lang, "secSummarySessions")}
                    value={`${summary.sessionReflectionPct}%`}
                  />
                </div>
                <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                  <h3 className="font-bold text-slate-700 mb-3">{t(lang, "secSummaryTrend")}</h3>
                  <ul className="space-y-2">
                    {summary.dailyTrend.map((d) => (
                      <li key={d.date} className="flex justify-between text-sm text-slate-600">
                        <span>{formatDate(d.date, lang)}</span>
                        <span className="font-bold text-slate-800">{d.scorePct}%</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>
        ) : null}
      </div>

      {saveConfirmOpen ? (
        <ConfirmModal
          lang={lang}
          title={t(lang, "secConfirmSaveTitle")}
          message={t(lang, "secConfirmSaveMessage")}
          date={selectedDate}
          saving={saveState === "saving"}
          onCancel={() => setSaveConfirmOpen(false)}
          onConfirm={async () => {
            const ok = await performSave();
            if (ok) setSaveConfirmOpen(false);
          }}
        />
      ) : null}

      {weekConfirmOpen ? (
        <ConfirmModal
          lang={lang}
          title={t(lang, "secWeeklyConfirmTitle")}
          message={t(lang, "secWeeklyConfirmMessage")}
          date={selectedDate}
          saving={weekSaveState === "saving"}
          onCancel={() => setWeekConfirmOpen(false)}
          onConfirm={async () => {
            const ok = await performWeekSave(true);
            if (ok) setWeekConfirmOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 text-center">
      <p className="text-[10px] font-bold text-slate-400 uppercase">{label}</p>
      <p className="text-2xl font-black text-slate-800 mt-1">{value}</p>
    </div>
  );
}

function formatDate(iso: string, lang: Lang): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString(lang === "id" ? "id-ID" : "en-GB", {
    day: "numeric",
    month: "short",
  });
}

function ConfirmModal({
  lang,
  title,
  message,
  date,
  saving,
  onCancel,
  onConfirm,
}: {
  lang: Lang;
  title: string;
  message: string;
  date: string;
  saving: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center p-4 bg-black/45"
      role="presentation"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-xl border border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-black text-slate-800">{title}</h2>
        <p className="text-sm text-slate-600 mt-2 leading-relaxed">{message}</p>
        <p className="text-xs font-bold text-slate-500 mt-2">
          {new Date(`${date}T12:00:00`).toLocaleDateString(lang === "id" ? "id-ID" : "en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
        <div className="flex gap-2 mt-5">
          <button
            type="button"
            className="flex-1 py-3 rounded-2xl font-bold text-sm border border-slate-200 text-slate-700"
            onClick={onCancel}
          >
            {t(lang, "secConfirmSaveCancel")}
          </button>
          <button
            type="button"
            disabled={saving}
            className="flex-1 py-3 rounded-2xl font-bold text-sm bg-primary text-white disabled:opacity-60"
            onClick={onConfirm}
          >
            {saving ? t(lang, "secSaving") : t(lang, "secConfirmSaveSubmit")}
          </button>
        </div>
      </div>
    </div>
  );
}
