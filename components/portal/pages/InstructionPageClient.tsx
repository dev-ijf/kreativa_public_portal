"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Clock, FileDown } from 'lucide-react';
import { FullPageBlockingLoader } from '@/components/portal/FullPageBlockingLoader';
import { Header } from '@/components/portal/Header';
import { usePortalState } from '@/components/portal/state/PortalProvider';
import type { PortalCheckoutSessionPayload, PortalPaymentInstructionRow } from '@/lib/data/portal-payment';
import { PORTAL_CHECKOUT_SESSION_KEY } from '@/lib/data/portal-payment';
import { formatRupiah } from '@/lib/utils/format';

function useCountdown(targetIso: string | undefined | null) {
  const targetMs = useMemo(() => {
    if (!targetIso) return 0;
    const t = new Date(targetIso).getTime();
    return Number.isFinite(t) ? t : 0;
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

export function InstructionPageClient() {
  const { lang, cart, selectedPayment, setCart } = usePortalState();
  const [copied, setCopied] = useState(false);
  /** `null` = belum pilih metode; `[]` = sudah fetch, tidak ada baris */
  const [rows, setRows] = useState<PortalPaymentInstructionRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutSnap, setCheckoutSnap] = useState<PortalCheckoutSessionPayload | null>(null);

  const total = useMemo(() => {
    const fromCart = cart.reduce((sum, i) => sum + i.amount, 0);
    if (fromCart > 0) return fromCart;
    const fromState = checkoutSnap?.totalAmount;
    if (typeof fromState === 'number' && Number.isFinite(fromState) && fromState > 0) return fromState;
    if (typeof window !== 'undefined') {
      try {
        const raw = sessionStorage.getItem(PORTAL_CHECKOUT_SESSION_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as PortalCheckoutSessionPayload;
          const t = parsed?.totalAmount;
          if (typeof t === 'number' && Number.isFinite(t) && t > 0) return t;
        }
      } catch {
        /* ignore */
      }
    }
    return 0;
  }, [cart, checkoutSnap]);

  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? sessionStorage.getItem(PORTAL_CHECKOUT_SESSION_KEY) : null;
      if (!raw) return;
      const parsed = JSON.parse(raw) as PortalCheckoutSessionPayload;
      if (parsed && typeof parsed.referenceNo === 'string') {
        setCheckoutSnap(parsed);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const vaNumber = useMemo(() => {
    if (checkoutSnap?.vaDisplay) return checkoutSnap.vaDisplay;
    if (checkoutSnap?.vaNo) return checkoutSnap.vaNo.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
    return '';
  }, [checkoutSnap]);

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
    if (checkoutSnap?.expiryAt) {
      const d = new Date(checkoutSnap.expiryAt);
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleString(lang === 'en' ? 'en-GB' : 'id-ID', opts);
      }
    }
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toLocaleString(lang === 'en' ? 'en-GB' : 'id-ID', {
      timeZone: tz,
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  }, [lang, checkoutSnap?.expiryAt]);

  const countdown = useCountdown(checkoutSnap?.expiryAt);
  const showVaBlock = selectedPayment?.type === 'va';

  const instructionPdfHref = useMemo(() => {
    const mid = selectedPayment?.dbMethodId;
    const tid = checkoutSnap?.transactionId?.trim();
    const tcat = checkoutSnap?.transactionCreatedAt?.trim();
    if (mid == null || !Number.isFinite(mid) || !tid || !tcat) return null;
    const sp = new URLSearchParams({
      methodId: String(mid),
      transactionId: tid,
      transactionCreatedAt: tcat,
      lang,
    });
    if (checkoutSnap?.expiryAt) sp.set('expiryAt', checkoutSnap.expiryAt);
    sp.set('preview', '1');
    return `/api/portal/payment-instructions/pdf?${sp.toString()}`;
  }, [selectedPayment?.dbMethodId, checkoutSnap?.transactionId, checkoutSnap?.transactionCreatedAt, checkoutSnap?.expiryAt, lang]);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(id);
  }, [copied]);

  useEffect(() => {
    const methodId = selectedPayment?.dbMethodId;
    if (methodId == null || !Number.isFinite(methodId)) {
      setRows(null);
      setLoading(false);
      setLoadError(null);
      return;
    }

    let cancelled = false;

    try {
      const raw = typeof window !== 'undefined' ? sessionStorage.getItem(PORTAL_CHECKOUT_SESSION_KEY) : null;
      if (raw) {
        const parsed = JSON.parse(raw) as PortalCheckoutSessionPayload;
        if (
          parsed.checkoutMethodId === methodId &&
          Array.isArray(parsed.instructionRows) &&
          parsed.instructionRows.length > 0
        ) {
          setRows(parsed.instructionRows);
          setLoadError(null);
          setLoading(false);
          return () => {
            cancelled = true;
          };
        }
      }
    } catch {
      /* lanjut fetch */
    }

    setLoading(true);
    setLoadError(null);

    void (async () => {
      try {
        let sidFromSession: number | null = checkoutSnap?.studentId ?? null;
        if (sidFromSession == null && typeof window !== 'undefined') {
          try {
            const raw = sessionStorage.getItem(PORTAL_CHECKOUT_SESSION_KEY);
            if (raw) {
              const p = JSON.parse(raw) as PortalCheckoutSessionPayload;
              if (typeof p.studentId === 'number' && Number.isFinite(p.studentId) && p.studentId > 0) {
                sidFromSession = Math.trunc(p.studentId);
              }
            }
          } catch {
            /* ignore */
          }
        }
        const sidRaw = sidFromSession ?? cart[0]?.childId;
        const sid =
          sidRaw != null && Number.isFinite(Number(sidRaw)) && Number(sidRaw) > 0 ? Math.trunc(Number(sidRaw)) : null;
        const qs = new URLSearchParams({ methodId: String(methodId) });
        if (sid != null) qs.set('studentId', String(sid));
        const res = await fetch(`/api/portal/payment-instructions?${qs.toString()}`);
        if (!res.ok) {
          if (!cancelled) {
            setLoadError(res.status === 403 ? 'forbidden' : 'error');
            setRows([]);
          }
          return;
        }
        const data = (await res.json()) as { rows?: PortalPaymentInstructionRow[] };
        if (!cancelled) {
          setRows(Array.isArray(data.rows) ? data.rows : []);
          setLoadError(null);
        }
      } catch {
        if (!cancelled) {
          setLoadError('error');
          setRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedPayment?.dbMethodId, checkoutSnap?.studentId, cart]);

  return (
    <div className="min-h-screen bg-slate-50 pb-8">
      {selectedPayment && loading ? (
        <FullPageBlockingLoader
          title={lang === 'en' ? 'Loading payment instructions…' : 'Memuat instruksi pembayaran…'}
          subtitle={
            lang === 'en'
              ? 'Please wait. Do not close this page.'
              : 'Mohon tunggu. Jangan tutup halaman ini.'
          }
        />
      ) : null}
      <Header title={lang === 'en' ? 'Payment Instruction' : 'Instruksi Pembayaran'} backHref="/payment-method" />

      <div className="px-4 pt-4 space-y-4">
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
          <p className="text-xs text-slate-500 font-semibold">{lang === 'en' ? 'Payment Method' : 'Metode'}</p>
          <p className="text-sm font-bold text-slate-700 mt-1">{selectedPayment?.label ?? (lang === 'en' ? 'Not selected' : 'Belum dipilih')}</p>
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-slate-500 font-semibold">{lang === 'en' ? 'Total Payment' : 'Total'}</p>
            <p className="text-lg font-bold text-primary">{formatRupiah(total)}</p>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-xs text-slate-500 font-semibold">{lang === 'en' ? 'Payment Deadline' : 'Batas Waktu'}</p>
            <p className="text-sm font-bold text-slate-700">{deadline}</p>
          </div>
        </div>

        {checkoutSnap?.expiryAt && (
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
                  <span className="text-[10px] text-slate-400 font-medium mt-1">
                    {lang === 'en' ? 'HOURS' : 'JAM'}
                  </span>
                </div>
                <span className="text-2xl font-bold text-slate-300 -mt-4">:</span>
                <div className="flex flex-col items-center">
                  <span className={`text-3xl font-bold tabular-nums ${countdown.h < 1 ? 'text-amber-600' : 'text-slate-800'}`}>
                    {String(countdown.m).padStart(2, '0')}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium mt-1">
                    {lang === 'en' ? 'MIN' : 'MENIT'}
                  </span>
                </div>
                <span className="text-2xl font-bold text-slate-300 -mt-4">:</span>
                <div className="flex flex-col items-center">
                  <span className={`text-3xl font-bold tabular-nums ${countdown.h < 1 ? 'text-amber-600' : 'text-slate-800'}`}>
                    {String(countdown.s).padStart(2, '0')}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium mt-1">
                    {lang === 'en' ? 'SEC' : 'DETIK'}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {showVaBlock ? (
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
            <p className="font-bold text-slate-700 mb-2">{lang === 'en' ? 'VA Number' : 'Nomor VA'}</p>
            {vaNumber ? (
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="font-bold text-slate-700 tracking-wider">{vaNumber}</p>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(vaNumber.replaceAll(' ', ''));
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
            ) : (
              <p className="text-sm text-slate-600">
                {lang === 'en' ? (
                  <>
                    Complete checkout on the{' '}
                    <Link href="/payment-method" className="font-bold text-primary underline">
                      payment method
                    </Link>{' '}
                    page to get your VA number.
                  </>
                ) : (
                  <>
                    Selesaikan checkout di halaman{' '}
                    <Link href="/payment-method" className="font-bold text-primary underline">
                      metode pembayaran
                    </Link>{' '}
                    untuk mendapat nomor VA.
                  </>
                )}
              </p>
            )}
          </div>
        ) : null}

        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
          <p className="font-bold text-slate-700 mb-3">{lang === 'en' ? 'How to pay' : 'Cara pembayaran'}</p>
          {!selectedPayment ? (
            <p className="text-sm text-slate-600">
              {lang === 'en' ? (
                <>
                  Choose a method on the{' '}
                  <Link href="/payment-method" className="font-bold text-primary underline">
                    payment method
                  </Link>{' '}
                  page first.
                </>
              ) : (
                <>
                  Pilih metode di halaman{' '}
                  <Link href="/payment-method" className="font-bold text-primary underline">
                    metode pembayaran
                  </Link>{' '}
                  terlebih dahulu.
                </>
              )}
            </p>
          ) : loading ? (
            <p className="text-sm text-slate-500 sr-only">{lang === 'en' ? 'Loading…' : 'Memuat…'}</p>
          ) : loadError === 'forbidden' ? (
            <p className="text-sm text-red-600">{lang === 'en' ? 'You cannot use this payment method.' : 'Metode pembayaran ini tidak tersedia.'}</p>
          ) : loadError ? (
            <p className="text-sm text-red-600">{lang === 'en' ? 'Failed to load instructions.' : 'Gagal memuat instruksi.'}</p>
          ) : rows && rows.length > 0 ? (
            <div className="space-y-6">
              {rows.map((row) => (
                <section key={row.id}>
                  <h3 className="font-bold text-slate-800 text-sm mb-2">{row.title}</h3>
                  <div
                    className="text-sm text-slate-600 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-1 [&_b]:font-bold [&_a]:text-primary [&_a]:underline"
                    // HTML dari admin DB (instruksi pembayaran)
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
          ) : selectedPayment && rows && rows.length > 0 ? (
            <p className="mt-4 text-xs text-slate-500">
              {lang === 'en'
                ? 'Complete checkout first to download instructions as PDF (same layout as the school app).'
                : 'Selesaikan checkout terlebih dahulu untuk mengunduh PDF instruksi (tampilan sama seperti di aplikasi sekolah).'}
            </p>
          ) : null}
        </div>

        <Link
          href="/finance"
          className="block text-center text-sm font-semibold text-primary py-3"
          onClick={() => setCart([])}
        >
          {lang === 'en' ? 'Back to tuition' : 'Kembali ke tuition'}
        </Link>
      </div>
    </div>
  );
}
