"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/portal/Header';
import { usePortalState } from '@/components/portal/state/PortalProvider';
import type { PortalPaymentInstructionRow } from '@/lib/data/portal-payment';
import { formatRupiah } from '@/lib/utils/format';

export function InstructionPageClient() {
  const { lang, cart, selectedPayment } = usePortalState();
  const [copied, setCopied] = useState(false);
  /** `null` = belum pilih metode; `[]` = sudah fetch, tidak ada baris */
  const [rows, setRows] = useState<PortalPaymentInstructionRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const total = cart.reduce((sum, i) => sum + i.amount, 0);
  const vaNumber = '1234 5678 9012 3456';
  const deadline = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toLocaleDateString(lang === 'en' ? 'en-GB' : 'id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
  }, [lang]);

  const showVaBlock = selectedPayment?.type === 'va';

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
        </div>

        <Link href="/success" className="w-full inline-flex items-center justify-center bg-primary text-white font-bold px-6 py-3 rounded-full hover:bg-primary-hover">
          {lang === 'en' ? 'I Have Paid' : 'Saya Sudah Bayar'}
        </Link>
      </div>
    </div>
  );
}
