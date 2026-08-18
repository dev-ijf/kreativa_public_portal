"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Clock, FileDown, FileText, Loader2 } from 'lucide-react';
import { FullPageBlockingLoader } from '@/components/portal/FullPageBlockingLoader';
import { Header } from '@/components/portal/Header';
import { usePortalState } from '@/components/portal/state/PortalProvider';
import type { PortalCheckoutSessionPayload, PortalPaymentInstructionRow } from '@/lib/data/portal-payment';
import { PORTAL_CHECKOUT_SESSION_KEY } from '@/lib/data/portal-payment';
import { t } from '@/lib/i18n/translations';
import { openTuitionReceiptPdf } from '@/lib/portal/tuition-receipt-url';
import { formatRupiah } from '@/lib/utils/format';
import { computePortalPaymentExpiryIso } from '@/lib/utils/payment-deadline';
import { formatDateTimeAsiaJakarta, parsePortalDbTimestamp } from '@/lib/utils/datetime-jakarta';

const PAYMENT_STATUS_POLL_MS = 5 * 60 * 1000;

type InstructionData = {
  transactionId: string;
  transactionCreatedAt: string;
  referenceNo: string;
  totalAmount: number;
  status: string;
  paymentDate: string | null;
  vaNo: string;
  vaDisplay: string;
  expiryAt: string;
  isBmi: boolean;
  studentId: number | null;
  paymentMethodId: number | null;
  paymentMethodName: string | null;
  paymentMethodCode: string | null;
  paymentMethodCategory: string | null;
  instructionRows: PortalPaymentInstructionRow[];
};

function mapInstructionJson(json: Record<string, unknown>, vaClean: string): InstructionData {
  return {
    transactionId: String(json.transactionId ?? ''),
    transactionCreatedAt: String(json.transactionCreatedAt ?? ''),
    referenceNo: String(json.referenceNo ?? ''),
    totalAmount: Number(json.totalAmount ?? 0),
    status: String(json.status ?? 'pending'),
    paymentDate: (json.paymentDate as string | null) ?? null,
    vaNo: String(json.vaNo ?? vaClean),
    vaDisplay: String(json.vaDisplay ?? vaClean),
    expiryAt: String(json.expiryAt ?? ''),
    isBmi: Boolean(json.isBmi),
    studentId: (json.studentId as number | null) ?? null,
    paymentMethodId: (json.paymentMethodId as number | null) ?? null,
    paymentMethodName: (json.paymentMethodName as string | null) ?? null,
    paymentMethodCode: (json.paymentMethodCode as string | null) ?? null,
    paymentMethodCategory: (json.paymentMethodCategory as string | null) ?? null,
    instructionRows: Array.isArray(json.instructionRows)
      ? (json.instructionRows as PortalPaymentInstructionRow[])
      : [],
  };
}

function useCountdown(targetIso: string | undefined | null) {
  const targetMs = useMemo(() => {
    if (!targetIso) return 0;
    const parsed = parsePortalDbTimestamp(targetIso).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  }, [targetIso]);

  const calc = useCallback(() => {
    if (!targetMs) return { diff: 0, h: 0, m: 0, s: 0, expired: true };
    const diff = Math.max(0, targetMs - Date.now());
    const totalSec = Math.floor(diff / 1000);
    return {
      diff,
      h: Math.floor(totalSec / 3600),
      m: Math.floor((totalSec % 3600) / 60),
      s: totalSec % 60,
      expired: diff <= 0,
    };
  }, [targetMs]);

  const [state, setState] = useState(calc);

  useEffect(() => {
    if (!targetMs) return;
    setState(calc());
    const id = setInterval(() => setState(calc()), 1000);
    return () => clearInterval(id);
  }, [targetMs, calc]);

  return state;
}

type Props = { vaNo: string };

export function InstructionPageClient({ vaNo }: Props) {
  const { lang, selectedPayment } = usePortalState();
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [data, setData] = useState<InstructionData | null>(null);
  const [checkingPaid, setCheckingPaid] = useState(false);
  const [notYetPaidMsg, setNotYetPaidMsg] = useState(false);
  const checkingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const vaClean = (vaNo ?? '').replace(/\D/g, '');
    if (!vaClean) {
      setLoading(false);
      setLoadError('invalid_va');
      return;
    }

    let hadSnap = false;
    try {
      const raw = typeof window !== 'undefined' ? sessionStorage.getItem(PORTAL_CHECKOUT_SESSION_KEY) : null;
      if (raw) {
        const snap = JSON.parse(raw) as PortalCheckoutSessionPayload;
        const snapVa = (snap.vaNo ?? '').replace(/\D/g, '');
        if (snapVa === vaClean && snap.referenceNo) {
          setData({
            transactionId: snap.transactionId ?? '',
            transactionCreatedAt: snap.transactionCreatedAt ?? '',
            referenceNo: snap.referenceNo,
            totalAmount: snap.totalAmount ?? 0,
            status: 'pending',
            paymentDate: null,
            vaNo: vaClean,
            vaDisplay: snap.vaDisplay ?? vaClean.replace(/(\d{4})(?=\d)/g, '$1 ').trim(),
            expiryAt: snap.expiryAt,
            isBmi: snap.isBmi,
            studentId: snap.studentId ?? null,
            paymentMethodId: snap.checkoutMethodId ?? selectedPayment?.dbMethodId ?? null,
            paymentMethodName: selectedPayment?.label ?? null,
            paymentMethodCode: selectedPayment?.code ?? null,
            paymentMethodCategory: selectedPayment?.category ?? null,
            instructionRows: snap.instructionRows ?? [],
          });
          setLoading(false);
          hadSnap = true;
        }
      }
    } catch {
      /* fallback to API */
    }

    if (!hadSnap) {
      setLoading(true);
    }
    setLoadError(null);

    void (async () => {
      try {
        const res = await fetch(`/api/portal/instruction/${encodeURIComponent(vaClean)}`);
        if (!res.ok) {
          if (!cancelled) {
            if (!hadSnap) {
              setLoadError(res.status === 404 ? 'not_found' : res.status === 403 ? 'forbidden' : 'error');
            }
            setLoading(false);
          }
          return;
        }
        const json = (await res.json()) as Record<string, unknown>;
        if (!cancelled) {
          setData(mapInstructionJson(json, vaClean));
          setLoadError(null);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          if (!hadSnap) {
            setLoadError('error');
          }
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [vaNo, selectedPayment?.dbMethodId, selectedPayment?.label, selectedPayment?.code, selectedPayment?.category]);

  const refreshPaymentStatus = useCallback(async (opts?: { showNotYetMsg?: boolean }) => {
    const vaClean = (vaNo ?? '').replace(/\D/g, '');
    if (!vaClean || checkingRef.current) return 'busy' as const;

    checkingRef.current = true;
    setCheckingPaid(true);
    if (opts?.showNotYetMsg) setNotYetPaidMsg(false);

    try {
      const res = await fetch(`/api/portal/instruction/${encodeURIComponent(vaClean)}`, {
        cache: 'no-store',
      });
      if (!res.ok) {
        if (opts?.showNotYetMsg) setNotYetPaidMsg(true);
        return 'error' as const;
      }
      const json = (await res.json()) as Record<string, unknown>;
      const next = mapInstructionJson(json, vaClean);
      setData(next);
      const paid = next.status.toLowerCase().trim() === 'success';
      if (!paid && opts?.showNotYetMsg) setNotYetPaidMsg(true);
      if (paid) setNotYetPaidMsg(false);
      return paid ? ('paid' as const) : ('pending' as const);
    } catch {
      if (opts?.showNotYetMsg) setNotYetPaidMsg(true);
      return 'error' as const;
    } finally {
      checkingRef.current = false;
      setCheckingPaid(false);
    }
  }, [vaNo]);

  const isSuccess = data?.status?.toLowerCase().trim() === 'success';
  const hasInstructionData = data != null;

  /** Poll every 5 minutes + re-check when PWA/tab becomes visible again. */
  useEffect(() => {
    if (loading || loadError || !hasInstructionData || isSuccess) return;

    const tick = () => {
      void refreshPaymentStatus({ showNotYetMsg: false });
    };

    const intervalId = window.setInterval(tick, PAYMENT_STATUS_POLL_MS);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [loading, loadError, hasInstructionData, isSuccess, refreshPaymentStatus]);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(id);
  }, [copied]);

  useEffect(() => {
    if (!notYetPaidMsg) return;
    const id = window.setTimeout(() => setNotYetPaidMsg(false), 6000);
    return () => window.clearTimeout(id);
  }, [notYetPaidMsg]);

  /** Utamakan `expiryAt` dari API (sudah dihitung server); recompute dari `transactionCreatedAt` hanya cadangan. */
  const effectiveExpiryIso = useMemo(() => {
    if (isSuccess || !data) return null;
    const serverExpiry = data.expiryAt?.trim();
    if (serverExpiry) {
      const probe = parsePortalDbTimestamp(serverExpiry);
      if (Number.isFinite(probe.getTime())) {
        return serverExpiry;
      }
    }
    const tcat = data.transactionCreatedAt?.trim();
    if (tcat) {
      const ms = parsePortalDbTimestamp(tcat).getTime();
      if (Number.isFinite(ms)) {
        return computePortalPaymentExpiryIso(ms);
      }
    }
    return null;
  }, [data, isSuccess]);

  const countdown = useCountdown(isSuccess ? null : effectiveExpiryIso);

  const vaDisplay = data?.vaDisplay ?? '';

  const total = data?.totalAmount ?? 0;
  const methodLabel = data?.paymentMethodName ?? selectedPayment?.label ?? '—';

  const deadline = useMemo(() => {
    const tz = 'Asia/Jakarta';
    const opts: Intl.DateTimeFormatOptions = {
      timeZone: tz,
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    };
    if (effectiveExpiryIso) {
      const d = parsePortalDbTimestamp(effectiveExpiryIso);
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleString(lang === 'en' ? 'en-GB' : 'id-ID', opts);
      }
    }
    return '—';
  }, [lang, effectiveExpiryIso]);

  const paymentDateStr = useMemo(() => {
    if (!data?.paymentDate) return '—';
    return formatDateTimeAsiaJakarta(data.paymentDate, lang);
  }, [lang, data?.paymentDate]);

  const instructionPdfHref = useMemo(() => {
    const mid = data?.paymentMethodId ?? selectedPayment?.dbMethodId;
    const tid = data?.transactionId?.trim();
    const tcat = data?.transactionCreatedAt?.trim();
    if (mid == null || !Number.isFinite(mid) || !tid || !tcat) return null;
    const sp = new URLSearchParams({
      methodId: String(mid),
      transactionId: tid,
      transactionCreatedAt: tcat,
      lang,
    });
    if (effectiveExpiryIso) sp.set('expiryAt', effectiveExpiryIso);
    sp.set('preview', '1');
    return `/api/portal/payment-instructions/pdf?${sp.toString()}`;
  }, [data?.paymentMethodId, selectedPayment?.dbMethodId, data?.transactionId, data?.transactionCreatedAt, effectiveExpiryIso, lang]);

  const rows = data?.instructionRows ?? [];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <FullPageBlockingLoader
          title={lang === 'en' ? 'Loading payment instructions…' : 'Memuat instruksi pembayaran…'}
          subtitle={lang === 'en' ? 'Please wait. Do not close this page.' : 'Mohon tunggu. Jangan tutup halaman ini.'}
        />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header title={lang === 'en' ? 'Payment Instruction' : 'Instruksi Pembayaran'} backHref="/finance" />
        <div className="px-4 pt-8 text-center">
          <p className="text-sm text-red-600 font-medium">
            {loadError === 'not_found'
              ? (lang === 'en' ? 'Transaction not found for this VA number.' : 'Transaksi tidak ditemukan untuk nomor VA ini.')
              : loadError === 'forbidden'
                ? (lang === 'en' ? 'You do not have access to this transaction.' : 'Anda tidak memiliki akses ke transaksi ini.')
                : (lang === 'en' ? 'Failed to load transaction data.' : 'Gagal memuat data transaksi.')}
          </p>
          <Link href="/finance" className="inline-block mt-4 text-sm font-bold text-primary">
            {lang === 'en' ? 'Back to tuition' : 'Kembali ke keuangan'}
          </Link>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 pb-8">
        <Header title={lang === 'en' ? 'Payment Successful' : 'Pembayaran Berhasil'} backHref="/finance" />
        <div className="px-4 pt-6 space-y-4">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
              <CheckCircle2 size={36} className="text-emerald-500" />
            </div>
            <h1 className="text-xl font-bold text-slate-800 mt-4">
              {lang === 'en' ? 'Payment Successful!' : 'Pembayaran Berhasil!'}
            </h1>
            <p className="text-sm text-slate-600 mt-2">
              {lang === 'en'
                ? 'Thank you, your payment has been received and recorded in our system.'
                : 'Terima kasih, pembayaran kamu sudah kami terima dan tercatat di sistem.'}
            </p>
          </div>

          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
            <p className="text-xs text-slate-500 font-semibold mb-3">
              {lang === 'en' ? 'Transaction Details' : 'Detail Transaksi'}
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">{lang === 'en' ? 'Total' : 'Total'}</span>
                <span className="text-sm font-bold text-primary">{formatRupiah(total)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">{lang === 'en' ? 'Payment Method' : 'Metode'}</span>
                <span className="text-sm font-bold text-slate-700">{methodLabel}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">{lang === 'en' ? 'Payment Date' : 'Tanggal Bayar'}</span>
                <span className="text-sm font-bold text-slate-700">{paymentDateStr}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">{lang === 'en' ? 'Reference' : 'Referensi'}</span>
                <span className="text-xs font-mono text-slate-500">{data?.referenceNo ?? '—'}</span>
              </div>
            </div>
          </div>

          {data?.transactionId && data?.transactionCreatedAt ? (
            <button
              type="button"
              onClick={() => openTuitionReceiptPdf(data.transactionId, data.transactionCreatedAt)}
              className="w-full inline-flex items-center justify-center gap-2 font-bold px-6 py-3 rounded-full border-2 border-primary text-primary bg-white hover:bg-primary-light transition-colors"
            >
              <FileText size={18} />
              {lang === 'en' ? 'Download Receipt (PDF)' : 'Unduh Kuitansi (PDF)'}
            </button>
          ) : null}

          <Link
            href="/finance"
            className="w-full inline-flex items-center justify-center font-bold px-6 py-3 rounded-full bg-primary text-white hover:bg-primary-hover transition-colors"
          >
            {lang === 'en' ? 'Back to Tuition' : 'Kembali ke Keuangan'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      <Header title={lang === 'en' ? 'Payment Instruction' : 'Instruksi Pembayaran'} backHref="/finance" />

      <div className="px-4 pt-4 space-y-4">
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
          <p className="text-xs text-slate-500 font-semibold">{lang === 'en' ? 'Payment Method' : 'Metode'}</p>
          <p className="text-sm font-bold text-slate-700 mt-1">{methodLabel}</p>
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-slate-500 font-semibold">{lang === 'en' ? 'Total Payment' : 'Total'}</p>
            <p className="text-lg font-bold text-primary">{formatRupiah(total)}</p>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-xs text-slate-500 font-semibold">{lang === 'en' ? 'Payment Deadline' : 'Batas Waktu'}</p>
            <p className="text-sm font-bold text-slate-700">{deadline}</p>
          </div>
        </div>

        {effectiveExpiryIso ? (
          <div className={`rounded-3xl p-5 shadow-sm border ${
            countdown.expired
              ? 'bg-red-50 border-red-200'
              : countdown.h < 1
                ? 'bg-amber-50 border-amber-200'
                : 'bg-white border-slate-100'
          }`}>
            <div className="flex items-center gap-2 mb-3">
              <Clock size={16} className={countdown.expired ? 'text-red-500' : countdown.h < 1 ? 'text-amber-500' : 'text-primary'} />
              <p className={`text-xs font-semibold ${
                countdown.expired ? 'text-red-600' : countdown.h < 1 ? 'text-amber-600' : 'text-slate-500'
              }`}>
                {countdown.expired
                  ? (lang === 'en' ? 'Payment Expired' : 'Pembayaran Kadaluarsa')
                  : (lang === 'en' ? 'Time Remaining' : 'Sisa Waktu Pembayaran')}
              </p>
            </div>
            {countdown.expired ? (
              <p className="text-sm text-red-600 font-semibold">
                {lang === 'en'
                  ? 'The payment deadline has passed. Please create a new transaction.'
                  : 'Batas waktu pembayaran telah lewat. Silakan buat transaksi baru.'}
              </p>
            ) : (
              <div className="flex items-center justify-center gap-3">
                <div className="flex flex-col items-center">
                  <span className={`text-3xl font-bold tabular-nums ${countdown.h < 1 ? 'text-amber-600' : 'text-slate-800'}`}>
                    {String(countdown.h).padStart(2, '0')}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium mt-1">{lang === 'en' ? 'HOURS' : 'JAM'}</span>
                </div>
                <span className="text-2xl font-bold text-slate-300 -mt-4">:</span>
                <div className="flex flex-col items-center">
                  <span className={`text-3xl font-bold tabular-nums ${countdown.h < 1 ? 'text-amber-600' : 'text-slate-800'}`}>
                    {String(countdown.m).padStart(2, '0')}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium mt-1">{lang === 'en' ? 'MIN' : 'MENIT'}</span>
                </div>
                <span className="text-2xl font-bold text-slate-300 -mt-4">:</span>
                <div className="flex flex-col items-center">
                  <span className={`text-3xl font-bold tabular-nums ${countdown.h < 1 ? 'text-amber-600' : 'text-slate-800'}`}>
                    {String(countdown.s).padStart(2, '0')}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium mt-1">{lang === 'en' ? 'SEC' : 'DETIK'}</span>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {vaDisplay ? (
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
            <p className="font-bold text-slate-700 mb-2">{lang === 'en' ? 'VA Number' : 'Nomor VA'}</p>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="font-bold text-slate-700 tracking-wider">{vaDisplay}</p>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(vaDisplay.replaceAll(' ', ''));
                    setCopied(true);
                  } catch {
                    setCopied(false);
                  }
                }}
                className="text-xs font-bold text-primary bg-white border border-slate-200 px-3 py-2 rounded-full hover:bg-slate-50"
              >
                {copied ? (lang === 'en' ? 'Copied' : 'Tersalin') : lang === 'en' ? 'Copy' : 'Salin'}
              </button>
            </div>
          </div>
        ) : null}

        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
          <p className="font-bold text-slate-700 mb-3">{lang === 'en' ? 'How to pay' : 'Cara pembayaran'}</p>
          {rows.length > 0 ? (
            <div className="space-y-6">
              {rows.map((row) => (
                <section key={row.id}>
                  <h3 className="font-bold text-slate-800 text-sm mb-2">{row.title}</h3>
                  <div
                    className="text-sm text-slate-600 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-1 [&_b]:font-bold [&_a]:text-primary [&_a]:underline"
                    dangerouslySetInnerHTML={{ __html: row.description }}
                  />
                </section>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-600">
              {lang === 'en' ? 'No instructions have been configured for this channel.' : 'Belum ada instruksi untuk channel ini.'}
            </p>
          )}
          {instructionPdfHref ? (
            <a
              href={instructionPdfHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 w-full inline-flex items-center justify-center gap-2 font-bold px-6 py-3 rounded-full border-2 border-primary text-primary bg-white hover:bg-primary-light transition-colors"
            >
              <FileDown size={18} />
              {lang === 'en' ? 'Download payment instructions (PDF)' : 'Unduh instruksi bayar (PDF)'}
            </a>
          ) : null}
        </div>

        <Link
          href="/finance"
          className="block text-center text-sm font-semibold text-primary py-3"
        >
          {lang === 'en' ? 'Back to tuition' : 'Kembali ke keuangan'}
        </Link>
      </div>

      <div className="fixed bottom-0 inset-x-0 z-20 border-t border-slate-100 bg-white/95 backdrop-blur-sm p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-lg space-y-2">
          {notYetPaidMsg ? (
            <p className="text-center text-xs font-medium text-amber-700 bg-amber-50 border border-amber-100 rounded-2xl px-3 py-2">
              {t(lang, 'paymentNotYetReceived')}
            </p>
          ) : (
            <p className="text-center text-[11px] text-slate-400">{t(lang, 'paymentCheckHint')}</p>
          )}
          <button
            type="button"
            disabled={checkingPaid}
            onClick={() => {
              void refreshPaymentStatus({ showNotYetMsg: true });
            }}
            className="w-full inline-flex items-center justify-center gap-2 bg-primary text-white font-bold py-3.5 rounded-full hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20 disabled:opacity-70 disabled:cursor-wait"
          >
            {checkingPaid ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                {t(lang, 'checkingPayment')}
              </>
            ) : (
              t(lang, 'iHavePaid')
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
