"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronRight, Plus } from "lucide-react";
import { Header } from "@/components/portal/Header";
import { ChildSelector } from "@/components/portal/ChildSelector";
import { usePortalState } from "@/components/portal/state/PortalProvider";
import { t, type Lang } from "@/lib/i18n/translations";
import type {
  AttendanceHistoryCursor,
  AttendanceSummary,
  PortalAttendanceRow,
} from "@/lib/data/server/attendance";

function monthRangeISO(): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const from = `${y}-${String(m + 1).padStart(2, "0")}-01`;
  const last = new Date(y, m + 1, 0).getDate();
  const to = `${y}-${String(m + 1).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  return { from, to };
}

function statusLabel(lang: Lang, raw: string): string {
  const s = raw.trim().toLowerCase();
  if (s === "sick") return t(lang, "attendanceStatusSick");
  if (s === "permission") return t(lang, "attendanceStatusPermission");
  if (s === "hadir" || s === "present") return t(lang, "attendanceStatusPresent");
  if (s === "absent" || s === "alpa" || s === "alpha") return t(lang, "attendanceStatusAbsent");
  return raw;
}

function badgeClass(raw: string): string {
  const s = raw.trim().toLowerCase();
  if (s === "sick") return "bg-orange-100 text-orange-700";
  if (s === "permission") return "bg-blue-100 text-blue-700";
  if (s === "hadir" || s === "present") return "bg-green-100 text-green-700";
  if (s === "absent" || s === "alpa" || s === "alpha") return "bg-red-100 text-red-700";
  return "bg-slate-100 text-slate-600";
}

function isPresentStatus(raw: string): boolean {
  const s = raw.trim().toLowerCase();
  return s === "hadir" || s === "present";
}

function rowNoteText(lang: Lang, row: PortalAttendanceRow): string | null {
  const n = lang === "en" ? row.noteEn : row.noteId;
  return n?.trim() ? n : null;
}

const ATTENDANCE_SUBMITTED_FLASH_KEY = "attendance_submitted_flash";

export function AttendancePageClient() {
  const { lang, activeChildId } = usePortalState();
  const [{ from: dateFrom, to: dateTo }, setRange] = useState(monthRangeISO);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [items, setItems] = useState<PortalAttendanceRow[]>([]);
  const [nextCursor, setNextCursor] = useState<AttendanceHistoryCursor | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const [toast, setToast] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    if (!activeChildId) {
      setSummary(null);
      return;
    }
    const params = new URLSearchParams({
      studentId: String(activeChildId),
      from: dateFrom,
      to: dateTo,
    });
    const res = await fetch(`/api/portal/attendance/summary?${params}`);
    if (!res.ok) {
      setSummary(null);
      return;
    }
    setSummary((await res.json()) as AttendanceSummary);
  }, [activeChildId, dateFrom, dateTo]);

  const loadHistoryPage = useCallback(
    async (cursor: AttendanceHistoryCursor | null, append: boolean) => {
      if (!activeChildId) return;
      const params = new URLSearchParams({
        studentId: String(activeChildId),
        from: dateFrom,
        to: dateTo,
        status: statusFilter,
      });
      if (cursor) {
        params.set("cursorDate", cursor.attendanceDate);
        params.set("cursorId", cursor.id);
      }
      const res = await fetch(`/api/portal/attendance/history?${params}`);
      if (!res.ok) return;
      const data = (await res.json()) as {
        rows: PortalAttendanceRow[];
        nextCursor: AttendanceHistoryCursor | null;
      };
      if (append) {
        setItems((prev) => [...prev, ...data.rows]);
      } else {
        setItems(data.rows);
      }
      setNextCursor(data.nextCursor);
    },
    [activeChildId, dateFrom, dateTo, statusFilter],
  );

  const refreshAll = useCallback(async () => {
    if (!activeChildId) {
      setItems([]);
      setNextCursor(null);
      setSummary(null);
      return;
    }
    setLoading(true);
    try {
      await loadSummary();
      await loadHistoryPage(null, false);
    } finally {
      setLoading(false);
    }
  }, [activeChildId, loadSummary, loadHistoryPage]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(ATTENDANCE_SUBMITTED_FLASH_KEY) !== "1") return;
    sessionStorage.removeItem(ATTENDANCE_SUBMITTED_FLASH_KEY);
    setToast(t(lang, "attendanceRequestSuccess"));
    window.setTimeout(() => setToast(null), 4000);
    void refreshAll();
  }, [lang, refreshAll]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore || loading) return;
    setLoadingMore(true);
    try {
      await loadHistoryPage(nextCursor, true);
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, loadingMore, loading, loadHistoryPage]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !nextCursor) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: "100px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [nextCursor, loadMore]);

  return (
    <div className="min-h-screen bg-slate-50 pb-6">
      <Header title={t(lang, "attendance")} backHref="/" />
      <ChildSelector />

      <div className="px-4 space-y-5">
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex flex-col gap-1 min-w-[140px]">
            <label
              htmlFor="attendance-filter-from"
              className="text-[10px] font-bold text-slate-500 uppercase tracking-wide"
            >
              {t(lang, "attendanceDateFrom")}
            </label>
            <input
              id="attendance-filter-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
              className="rounded-lg border border-slate-200 px-2 py-2 text-sm bg-white"
            />
          </div>
          <div className="flex flex-col gap-1 min-w-[140px]">
            <label
              htmlFor="attendance-filter-to"
              className="text-[10px] font-bold text-slate-500 uppercase tracking-wide"
            >
              {t(lang, "attendanceDateTo")}
            </label>
            <input
              id="attendance-filter-to"
              type="date"
              value={dateTo}
              onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
              className="rounded-lg border border-slate-200 px-2 py-2 text-sm bg-white"
            />
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
            <label
              htmlFor="attendance-filter-status"
              className="text-[10px] font-bold text-slate-500 uppercase tracking-wide"
            >
              {t(lang, "attendanceStatusFilter")}
            </label>
            <select
              id="attendance-filter-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-200 px-2 py-2 text-sm bg-white"
              aria-label={t(lang, "attendanceStatusFilter")}
            >
              <option value="all">{t(lang, "attendanceStatusAll")}</option>
              <option value="hadir">{t(lang, "attendanceStatusPresent")}</option>
              <option value="sick">{t(lang, "attendanceStatusSick")}</option>
              <option value="permission">{t(lang, "attendanceStatusPermission")}</option>
              <option value="absent">{t(lang, "attendanceStatusAbsent")}</option>
            </select>
          </div>
        </div>

        {activeChildId ? (
          <Link
            href="/attendance/request"
            className="flex w-full items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-2.5 py-2 shadow-sm text-left transition-colors hover:border-slate-300 hover:bg-slate-50/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2"
            aria-label={t(lang, "attendanceSubmitRequestAria")}
          >
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-sm"
              aria-hidden
            >
              <Plus className="size-5" strokeWidth={2.5} />
            </span>
            <span className="min-w-0 flex-1 text-sm font-semibold text-slate-800">
              {t(lang, "attendanceSubmitRequest")}
            </span>
            <ChevronRight className="size-5 shrink-0 text-slate-400" aria-hidden strokeWidth={2.25} />
          </Link>
        ) : (
          <div
            className="flex w-full cursor-not-allowed items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/90 px-2.5 py-2 opacity-50"
            aria-disabled
            aria-label={t(lang, "attendanceNoChild")}
          >
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-300 text-white"
              aria-hidden
            >
              <Plus className="size-5" strokeWidth={2.5} />
            </span>
            <span className="min-w-0 flex-1 text-sm font-semibold text-slate-500">
              {t(lang, "attendanceSubmitRequest")}
            </span>
            <ChevronRight className="size-5 shrink-0 text-slate-300" aria-hidden strokeWidth={2.25} />
          </div>
        )}

        {toast ? (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-2">
            {toast}
          </div>
        ) : null}

        <div>
          <h3 className="font-bold text-slate-700 mb-3">{t(lang, "attendanceSummaryTitle")}</h3>
          {!activeChildId ? (
            <p className="text-sm text-slate-500">{t(lang, "attendanceNoChild")}</p>
          ) : loading && !summary ? (
            <p className="text-sm text-slate-500">…</p>
          ) : summary ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-green-100">
                <p className="text-xs text-slate-500 font-semibold mb-1">{t(lang, "attendanceStatusPresent")}</p>
                <p className="text-2xl font-bold text-green-600">{summary.present}</p>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-orange-100">
                <p className="text-xs text-slate-500 font-semibold mb-1">{t(lang, "attendanceStatusSick")}</p>
                <p className="text-2xl font-bold text-orange-500">{summary.sick}</p>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-100">
                <p className="text-xs text-slate-500 font-semibold mb-1">{t(lang, "attendanceStatusPermission")}</p>
                <p className="text-2xl font-bold text-blue-500">{summary.permission}</p>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-red-100">
                <p className="text-xs text-slate-500 font-semibold mb-1">{t(lang, "attendanceStatusAbsent")}</p>
                <p className="text-2xl font-bold text-red-500">{summary.absent}</p>
              </div>
            </div>
          ) : null}
        </div>

        <div>
          <h3 className="font-bold text-slate-700 mb-3">{t(lang, "attendanceHistoryTitle")}</h3>
          {!activeChildId ? (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 text-center text-slate-400 text-sm">
              {t(lang, "attendanceNoChild")}
            </div>
          ) : items.length === 0 && !loading ? (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 text-center text-slate-400 text-sm">
              {t(lang, "attendanceEmptyHistory")}
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((h) => {
                const note = rowNoteText(lang, h);
                const presentNoNote = isPresentStatus(h.status) && !note;
                const titleLine = note ?? statusLabel(lang, h.status);
                return (
                  <div
                    key={`${h.id}-${h.attendanceDate}`}
                    className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between gap-3"
                  >
                    {presentNoNote ? (
                      <div className="min-w-0 flex items-start gap-3 flex-1">
                        <div
                          className="shrink-0 rounded-full bg-green-100 p-2 ring-2 ring-green-200/60"
                          aria-hidden
                        >
                          <CheckCircle2 className="size-5 text-green-600" strokeWidth={2.25} />
                        </div>
                        <div className="min-w-0 pt-0.5">
                          <p className="font-bold text-green-800 text-sm leading-snug">
                            {t(lang, "attendancePresentNoNoteCaption")}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">{h.attendanceDate}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-700 text-sm">{titleLine}</p>
                        <p className="text-xs text-slate-500">{h.attendanceDate}</p>
                      </div>
                    )}
                    <span
                      className={["text-xs font-bold px-2.5 py-1 rounded-md shrink-0", badgeClass(h.status)].join(" ")}
                    >
                      {statusLabel(lang, h.status)}
                    </span>
                  </div>
                );
              })}
              {nextCursor ? <div ref={sentinelRef} className="h-3" aria-hidden /> : null}
              {loadingMore ? (
                <p className="text-center text-xs text-slate-500 py-2">…</p>
              ) : null}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
