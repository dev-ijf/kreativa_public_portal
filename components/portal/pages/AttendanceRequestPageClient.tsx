"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Header } from "@/components/portal/Header";
import { ChildSelector } from "@/components/portal/ChildSelector";
import { usePortalState, useActiveChild } from "@/components/portal/state/PortalProvider";
import { t } from "@/lib/i18n/translations";

export function AttendanceRequestPageClient() {
  const router = useRouter();
  const { lang, activeChildId } = usePortalState();
  const activeChild = useActiveChild();
  const [requestType, setRequestType] = useState<"sick" | "permission">("permission");
  const [requestDate, setRequestDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [requestNote, setRequestNote] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  const openConfirm = () => {
    setFormError(null);
    const note = requestNote.trim();
    if (!note) {
      setFormError(lang === "en" ? "Please enter a reason." : "Isi keterangan.");
      return;
    }
    setConfirmOpen(true);
  };

  const submitFinal = async () => {
    if (!activeChildId) return;
    setSubmitLoading(true);
    setFormError(null);
    try {
      const res = await fetch("/api/portal/attendance/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: activeChildId,
          attendanceDate: requestDate,
          status: requestType,
          note: requestNote.trim(),
        }),
      });
      if (res.status === 409) {
        setFormError(t(lang, "attendanceRequestErrorDuplicate"));
        setConfirmOpen(false);
        return;
      }
      if (!res.ok) {
        setFormError(t(lang, "attendanceRequestErrorGeneric"));
        setConfirmOpen(false);
        return;
      }
      try {
        sessionStorage.setItem("attendance_submitted_flash", "1");
      } catch {
        /* ignore quota / private mode */
      }
      router.push("/attendance");
    } finally {
      setSubmitLoading(false);
    }
  };

  const typeLabel =
    requestType === "sick"
      ? t(lang, "attendanceRequestTypeSick")
      : t(lang, "attendanceRequestTypePermission");

  return (
    <div className="min-h-screen bg-slate-50 pb-6">
      <Header title={t(lang, "attendanceRequestPageTitle")} backHref="/attendance" />
      <ChildSelector />

      <div className="px-4 space-y-5 pt-1">
        {!activeChild ? (
          <p className="text-sm text-slate-500">{t(lang, "attendanceNoChild")}</p>
        ) : (
          <>
            <p className="text-sm text-slate-600 leading-relaxed">{t(lang, "attendanceRequestPageHint")}</p>

            <div className="rounded-xl bg-white border border-slate-100 shadow-sm p-4 space-y-4">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">
                  {t(lang, "attendanceRequestForStudent")}
                </p>
                <p className="font-bold text-slate-800">{activeChild.fullName}</p>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">
                  {t(lang, "attendanceRequestAbsenceDate")}
                </p>
                <label htmlFor="req-absence-date" className="sr-only">
                  {t(lang, "attendanceRequestAbsenceDate")}
                </label>
                <input
                  id="req-absence-date"
                  type="date"
                  value={requestDate}
                  onChange={(e) => setRequestDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-800"
                />
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">
                  {t(lang, "attendanceRequestTypeLabel")}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRequestType("sick")}
                    className={[
                      "rounded-xl py-3 text-sm font-bold border transition-colors",
                      requestType === "sick"
                        ? "bg-primary text-white border-primary shadow-md"
                        : "bg-slate-50 text-slate-700 border-slate-200",
                    ].join(" ")}
                  >
                    {t(lang, "attendanceRequestTypeSick")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRequestType("permission")}
                    className={[
                      "rounded-xl py-3 text-sm font-bold border transition-colors",
                      requestType === "permission"
                        ? "bg-primary text-white border-primary shadow-md"
                        : "bg-slate-50 text-slate-700 border-slate-200",
                    ].join(" ")}
                  >
                    {t(lang, "attendanceRequestTypePermission")}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="req-note" className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-2">
                  {t(lang, "attendanceRequestNote")}
                </label>
                <textarea
                  id="req-note"
                  value={requestNote}
                  onChange={(e) => setRequestNote(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  aria-label={t(lang, "attendanceRequestNote")}
                />
              </div>

              {formError && !confirmOpen ? <p className="text-sm text-red-600">{formError}</p> : null}

              <button
                type="button"
                onClick={openConfirm}
                className="w-full rounded-full bg-primary text-white py-3 text-sm font-bold shadow-sm"
              >
                {t(lang, "attendanceRequestReview")}
              </button>
            </div>
          </>
        )}
      </div>

      {confirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/45">
          <div
            role="dialog"
            aria-modal="true"
            className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-5 space-y-4"
          >
            <h2 className="font-bold text-slate-900 text-lg">{t(lang, "attendanceRequestConfirmTitle")}</h2>
            <div className="rounded-lg bg-slate-50 border border-slate-100 p-4 space-y-2 text-sm">
              <p>
                <span className="text-slate-500">{t(lang, "attendanceRequestForStudent")} </span>
                <span className="font-bold text-slate-800">{activeChild?.fullName}</span>
              </p>
              <p>
                <span className="text-slate-500">{t(lang, "attendanceRequestAbsenceDate")} </span>
                <span className="font-bold text-slate-800">{requestDate}</span>
              </p>
              <p>
                <span className="text-slate-500">{t(lang, "attendanceRequestTypeLabel")} </span>
                <span className="font-bold text-slate-800">{typeLabel}</span>
              </p>
              <p>
                <span className="text-slate-500">{t(lang, "attendanceRequestNote")} </span>
                <span className="font-medium text-slate-800 block mt-1 whitespace-pre-wrap">{requestNote.trim()}</span>
              </p>
            </div>
            {formError && confirmOpen ? <p className="text-sm text-red-600">{formError}</p> : null}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                disabled={submitLoading}
                onClick={() => {
                  setConfirmOpen(false);
                  setFormError(null);
                }}
                className="flex-1 rounded-full border border-slate-200 py-2.5 text-sm font-bold text-slate-600"
              >
                {t(lang, "attendanceRequestConfirmBack")}
              </button>
              <button
                type="button"
                disabled={submitLoading}
                onClick={() => void submitFinal()}
                className="flex-1 rounded-full bg-primary text-white py-2.5 text-sm font-bold disabled:opacity-60"
              >
                {submitLoading ? "…" : t(lang, "attendanceRequestConfirmSubmit")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
