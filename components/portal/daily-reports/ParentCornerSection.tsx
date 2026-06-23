"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DailyReportFull } from "@/lib/portal/daily-reports-shared";
import { t, type Lang } from "@/lib/i18n/translations";
import {
  FieldCaption,
  FieldLabel,
  FieldValue,
  ReportSectionShell,
} from "@/components/portal/daily-reports/ReportSectionShell";

type Props = {
  report: DailyReportFull;
  lang: Lang;
  studentId: number;
  selectedDate: string;
  onUpdated: (report: DailyReportFull) => void;
  disabled?: boolean;
};

function formatReadAt(iso: string, lang: Lang): string {
  const d = new Date(iso);
  return d.toLocaleString(lang === "id" ? "id-ID" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ParentCornerSection({
  report,
  lang,
  studentId,
  selectedDate,
  onUpdated,
  disabled,
}: Props) {
  const [message, setMessage] = useState(report.parentMessage ?? "");
  const [readConfirmed, setReadConfirmed] = useState(report.parentReadConfirmed);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const lastSaved = useRef(JSON.stringify({ message: report.parentMessage ?? "", readConfirmed: report.parentReadConfirmed }));

  useEffect(() => {
    setMessage(report.parentMessage ?? "");
    setReadConfirmed(report.parentReadConfirmed);
    lastSaved.current = JSON.stringify({
      message: report.parentMessage ?? "",
      readConfirmed: report.parentReadConfirmed,
    });
  }, [report.id, report.parentMessage, report.parentReadConfirmed]);

  useEffect(() => {
    if (!confirmOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setConfirmOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmOpen]);

  const isDirty = useMemo(() => {
    return JSON.stringify({ message, readConfirmed }) !== lastSaved.current;
  }, [message, readConfirmed]);

  const teacherDisplay = report.teacherNames.length
    ? report.teacherNames.join(", ")
    : t(lang, "drTeachersEmpty");

  const showReadTimestamp =
    readConfirmed && report.parentReadConfirmed && Boolean(report.parentReadAt);

  const performSave = useCallback(async () => {
    setSaveState("saving");
    try {
      const res = await fetch("/api/portal/daily-reports/parent", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          date: selectedDate,
          parentMessage: message,
          parentReadConfirmed: readConfirmed,
        }),
      });
      if (!res.ok) {
        setSaveState("error");
        return false;
      }
      const data = (await res.json()) as { report: DailyReportFull };
      onUpdated(data.report);
      setMessage(data.report.parentMessage ?? "");
      setReadConfirmed(data.report.parentReadConfirmed);
      lastSaved.current = JSON.stringify({
        message: data.report.parentMessage ?? "",
        readConfirmed: data.report.parentReadConfirmed,
      });
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1500);
      return true;
    } catch {
      setSaveState("error");
      return false;
    }
  }, [studentId, selectedDate, message, readConfirmed, onUpdated]);

  return (
    <>
      <ReportSectionShell
        title={t(lang, "drSectionParentCorner")}
        icon="👪"
        headerClassName="bg-gradient-to-r from-purple-600 to-violet-700"
      >
        <div>
          <FieldLabel htmlFor="dr-parent-msg">{t(lang, "drParentMessageLabel")}</FieldLabel>
          <textarea
            id="dr-parent-msg"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={disabled}
            placeholder={t(lang, "drParentMessagePlaceholder")}
            rows={4}
            className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-[15px] font-normal text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
          />
        </div>

        <label
          className={[
            "flex items-start gap-3 p-4 rounded-2xl border border-slate-200 bg-slate-50 transition-colors",
            disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-primary/30",
          ].join(" ")}
        >
          <input
            type="checkbox"
            checked={readConfirmed}
            disabled={disabled}
            onChange={(e) => setReadConfirmed(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 rounded-md border-slate-300 text-primary focus:ring-primary/30"
          />
          <span className="min-w-0">
            <span className="block text-[15px] font-semibold text-slate-900 leading-snug">
              {t(lang, "drReadConfirm")}
            </span>
            {showReadTimestamp && report.parentReadAt ? (
              <FieldCaption className="mt-1 text-emerald-700">
                {t(lang, "drReadAt")}: {formatReadAt(report.parentReadAt, lang)}
              </FieldCaption>
            ) : null}
          </span>
        </label>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <FieldLabel>{t(lang, "drSignatureTeacher")}</FieldLabel>
          <FieldValue>{teacherDisplay}</FieldValue>
        </div>

        <div className="space-y-2 pt-1">
          <FieldCaption>{t(lang, "drSaveHint")}</FieldCaption>
          {saveState === "saving" ? (
            <p className="text-xs font-bold text-slate-500 text-center">{t(lang, "drSaving")}</p>
          ) : null}
          {saveState === "saved" ? (
            <p className="text-xs font-bold text-emerald-600 text-center">{t(lang, "drSaved")}</p>
          ) : null}
          {saveState === "error" ? (
            <p className="text-xs font-bold text-red-600 text-center">{t(lang, "drSaveError")}</p>
          ) : null}
          <button
            type="button"
            disabled={disabled || !isDirty || saveState === "saving"}
            onClick={() => setConfirmOpen(true)}
            className="w-full py-3.5 rounded-2xl bg-primary text-white text-sm font-bold disabled:opacity-40 shadow-sm shadow-primary/20"
          >
            {t(lang, "drSaveButton")}
          </button>
        </div>
      </ReportSectionShell>

      {confirmOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center p-0 sm:p-4 bg-black/45"
          role="presentation"
          onClick={() => setConfirmOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="dr-confirm-title"
            className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl bg-white p-5 pb-8 sm:pb-5 shadow-xl border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="dr-confirm-title" className="text-lg font-black text-slate-800">
              {t(lang, "drConfirmSaveTitle")}
            </h2>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              {t(lang, "drConfirmSaveMessage")}
            </p>
            <p className="text-xs font-bold text-slate-500 mt-2">
              {new Date(`${selectedDate}T12:00:00`).toLocaleDateString(lang === "id" ? "id-ID" : "en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
            <div className="flex flex-col gap-2 mt-5 w-full">
              <button
                type="button"
                disabled={saveState === "saving"}
                onClick={async () => {
                  const ok = await performSave();
                  if (ok) setConfirmOpen(false);
                }}
                className="w-full py-3.5 rounded-2xl font-bold text-sm bg-primary text-white disabled:opacity-60"
              >
                {saveState === "saving" ? t(lang, "drSaving") : t(lang, "drConfirmSaveSubmit")}
              </button>
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="w-full py-3.5 rounded-2xl font-bold text-sm border border-slate-200 text-slate-700 bg-white hover:bg-slate-50"
              >
                {t(lang, "drConfirmSaveCancel")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
