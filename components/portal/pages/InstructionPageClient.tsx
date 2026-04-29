"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { FileDown } from 'lucide-react';
import { Header } from '@/components/portal/Header';
import { usePortalState } from '@/components/portal/state/PortalProvider';
import type { PortalCheckoutSessionPayload, PortalPaymentInstructionRow } from '@/lib/data/portal-payment';
import { PORTAL_CHECKOUT_SESSION_KEY } from '@/lib/data/portal-payment';
import { formatRupiah } from '@/lib/utils/format';

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
    setLoading(true);
    setLoadError(null);

    void (async () => {
      try {
        const res = await fetch(`/api/portal/payment-instructions?methodId=${encodeURIComponent(String(methodId))}`);
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
  }, [selectedPayment?.dbMethodId]);

  return (
    <div className="min-h-screen bg-slate-50 pb-8">
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
            <p className="text-sm text-slate-500">{lang === 'en' ? 'Loading…' : 'Memuat…'}</p>
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
