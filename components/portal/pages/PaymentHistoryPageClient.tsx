"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Calendar, FileText, Loader2 } from 'lucide-react';
import { Header } from '@/components/portal/Header';
import { ChildSelector } from '@/components/portal/ChildSelector';
import { usePortalState } from '@/components/portal/state/PortalProvider';
import { persistPortalSessionForPendingInstruction } from '@/lib/portal/instruction-from-payment-history';
import type { PortalTuitionTransaction } from '@/lib/data/server/finance-transactions';
import { openTuitionReceiptPdf } from '@/lib/portal/tuition-receipt-url';
import { formatRupiah } from '@/lib/utils/format';
import { formatDateTimeAsiaJakarta } from '@/lib/utils/datetime-jakarta';

type PaymentHistoryPageClientProps = {
  initialPaidByChildId: Record<number, PortalTuitionTransaction[]>;
  initialPendingByChildId: Record<number, PortalTuitionTransaction[]>;
  pageSize?: number;
};

function buildTitle(tx: PortalTuitionTransaction, lang: 'en' | 'id'): string {
  const titleParts = tx.lines.map((l) => l.label);
  if (titleParts.length <= 1) {
    return titleParts[0] ?? (lang === 'en' ? 'Payment' : 'Pembayaran');
  }
  return (
    titleParts.slice(0, 2).join(' & ') + (titleParts.length > 2 ? ` +${titleParts.length - 2}` : '')
  );
}

const DEFAULT_PAGE_SIZE = 5;

export function PaymentHistoryPageClient({
  initialPaidByChildId,
  initialPendingByChildId,
  pageSize = DEFAULT_PAGE_SIZE,
}: PaymentHistoryPageClientProps) {
  const router = useRouter();
  const { lang, activeChildId, setSelectedPayment } = usePortalState();
  const [tab, setTab] = useState<'checkout' | 'paid'>('paid');

  const [paidByChild, setPaidByChild] = useState(initialPaidByChildId);
  const [pendingByChild, setPendingByChild] = useState(initialPendingByChildId);

  const [paidHasMore, setPaidHasMore] = useState<Record<number, boolean>>(() => {
    const m: Record<number, boolean> = {};
    for (const [k, v] of Object.entries(initialPaidByChildId)) m[Number(k)] = v.length >= pageSize;
    return m;
  });
  const [pendingHasMore, setPendingHasMore] = useState<Record<number, boolean>>(() => {
    const m: Record<number, boolean> = {};
    for (const [k, v] of Object.entries(initialPendingByChildId)) m[Number(k)] = v.length >= pageSize;
    return m;
  });

  const [loadingMore, setLoadingMore] = useState(false);

  const prevChildRef = useRef(activeChildId);
  useEffect(() => {
    if (prevChildRef.current !== activeChildId) {
      prevChildRef.current = activeChildId;
    }
  }, [activeChildId]);

  const paidList = paidByChild[activeChildId] ?? [];
  const pendingList = pendingByChild[activeChildId] ?? [];

  const currentHasMore = tab === 'paid'
    ? (paidHasMore[activeChildId] ?? false)
    : (pendingHasMore[activeChildId] ?? false);

  const currentList = tab === 'paid' ? paidList : pendingList;

  const loadMore = useCallback(async () => {
    if (loadingMore || !currentHasMore) return;
    setLoadingMore(true);
    try {
      const offset = currentList.length;
      const res = await fetch(
        `/api/portal/payment-history?studentId=${activeChildId}&tab=${tab}&limit=${pageSize}&offset=${offset}`,
      );
      if (!res.ok) return;
      const data = (await res.json()) as { items: PortalTuitionTransaction[]; hasMore: boolean };

      if (tab === 'paid') {
        setPaidByChild((prev) => ({
          ...prev,
          [activeChildId]: [...(prev[activeChildId] ?? []), ...data.items],
        }));
        setPaidHasMore((prev) => ({ ...prev, [activeChildId]: data.hasMore }));
      } else {
        setPendingByChild((prev) => ({
          ...prev,
          [activeChildId]: [...(prev[activeChildId] ?? []), ...data.items],
        }));
        setPendingHasMore((prev) => ({ ...prev, [activeChildId]: data.hasMore }));
      }
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, currentHasMore, currentList.length, activeChildId, tab, pageSize]);

  const goToInstruction = useCallback(
    (tx: PortalTuitionTransaction) => {
      const pm = persistPortalSessionForPendingInstruction(tx);
      setSelectedPayment(pm);
      const vaTarget = tx.vaNo ? String(tx.vaNo).replace(/\D/g, '') : '';
      router.push(vaTarget ? `/instruction/${vaTarget}` : '/finance');
    },
    [router, setSelectedPayment],
  );

  const tabBtn = (id: 'checkout' | 'paid', labelEn: string, labelId: string) => (
    <button
      key={id}
      type="button"
      onClick={() => setTab(id)}
      className={[
        'flex-1 py-2.5 text-sm font-bold rounded-xl transition-colors',
        tab === id ? 'bg-primary text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100',
      ].join(' ')}
    >
      {lang === 'en' ? labelEn : labelId}
    </button>
  );

  const pendingStatusLabel = lang === 'en' ? 'Pending' : 'Menunggu';

  const dateForTx = (tx: PortalTuitionTransaction) =>
    tab === 'checkout'
      ? formatDateTimeAsiaJakarta(tx.transactionCreatedAt, lang)
      : formatDateTimeAsiaJakarta(tx.paymentDate ?? tx.transactionCreatedAt, lang);

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <Header title={lang === 'en' ? 'Payment History' : 'Riwayat Pembayaran'} backHref="/finance" />
      <ChildSelector />

      <div className="px-4 md:px-6 mt-2 space-y-4">
        {/* Mobile: pill tabs */}
        <div className="flex gap-2 p-1 bg-white rounded-2xl border border-slate-100 shadow-sm md:hidden">
          {tabBtn('checkout', 'Checkout', 'Menunggu bayar')}
          {tabBtn('paid', 'Paid', 'Berhasil')}
        </div>
        {/* Desktop: underline tabs */}
        <div className="hidden md:flex border-b border-slate-200">
          {(['checkout', 'paid'] as const).map((id) => {
            const label = id === 'checkout'
              ? (lang === 'en' ? 'Checkout' : 'Menunggu bayar')
              : (lang === 'en' ? 'Paid' : 'Berhasil');
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={[
                  'px-6 py-3 text-sm font-bold border-b-2 -mb-px transition-colors',
                  tab === id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300',
                ].join(' ')}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* ===== Mobile: cards ===== */}
        <div className="md:hidden space-y-4">
          {tab === 'checkout' && pendingList.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 border border-slate-100 text-center text-sm text-slate-600">
              {lang === 'en'
                ? 'You have no payments waiting to be completed. New checkouts will appear here after you choose a payment method.'
                : 'Tidak ada pembayaran yang masih menunggu. Transaksi checkout baru akan muncul di sini setelah Anda memilih metode bayar.'}
            </div>
          ) : null}

          {tab === 'checkout' && pendingList.length > 0
            ? pendingList.map((tx) => (
                <button
                  key={`${tx.transactionId}-${tx.transactionCreatedAt}`}
                  type="button"
                  onClick={() => goToInstruction(tx)}
                  className="w-full text-left bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:border-primary/40 hover:bg-primary-light/30 transition-colors"
                >
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <div className="flex items-center gap-2 text-slate-600 text-xs min-w-0">
                      <Calendar size={14} className="shrink-0" />
                      <span className="truncate">{dateForTx(tx)}</span>
                    </div>
                    <span className="shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                      {pendingStatusLabel}
                    </span>
                  </div>
                  <p className="font-bold text-slate-800 text-sm mb-0.5">{buildTitle(tx, lang)}</p>
                  <p className="text-xs text-slate-500 mb-3">{tx.paymentMethodName ?? '—'}</p>

                  {tx.lines.length > 1 ? (
                    <div className="bg-slate-50 rounded-xl p-3 mb-3 border border-slate-100">
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-2">
                        {lang === 'en' ? 'Transaction details' : 'Rincian transaksi'}
                      </p>
                      <div className="space-y-1.5">
                        {tx.lines.map((line, i) => (
                          <div key={i} className="flex justify-between text-xs gap-2">
                            <span className="text-slate-600 truncate">{line.label}</span>
                            <span className="font-semibold text-slate-800 shrink-0">{formatRupiah(line.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="flex justify-between items-end gap-2">
                    <div>
                      <p className="text-[10px] text-slate-500 font-semibold uppercase">
                        {lang === 'en' ? 'Total payment' : 'Total pembayaran'}
                      </p>
                      <p className="text-lg font-bold text-primary">{formatRupiah(tx.totalAmount)}</p>
                    </div>
                    <span className="text-[10px] font-bold text-primary shrink-0">
                      {lang === 'en' ? 'Tap for instructions →' : 'Ketuk untuk instruksi →'}
                    </span>
                  </div>
                </button>
              ))
            : null}

          {tab === 'paid' ? (
            paidList.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 border border-slate-100 text-center text-sm text-slate-600">
                {lang === 'en' ? 'No successful payments yet.' : 'Belum ada pembayaran berhasil.'}
              </div>
            ) : (
              paidList.map((tx) => (
                <div
                  key={`${tx.transactionId}-${tx.transactionCreatedAt}`}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100"
                >
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <div className="flex items-center gap-2 text-slate-600 text-xs min-w-0">
                      <Calendar size={14} className="shrink-0" />
                      <span className="truncate">{dateForTx(tx)}</span>
                    </div>
                    <span className="shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      {(tx.status ?? '').toUpperCase()}
                    </span>
                  </div>
                  <p className="font-bold text-slate-800 text-sm mb-0.5">{buildTitle(tx, lang)}</p>
                  <p className="text-xs text-slate-500 mb-3">{tx.paymentMethodName ?? '—'}</p>

                  {tx.lines.length > 1 ? (
                    <div className="bg-slate-50 rounded-xl p-3 mb-3 border border-slate-100">
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-2">
                        {lang === 'en' ? 'Transaction details' : 'Rincian transaksi'}
                      </p>
                      <div className="space-y-1.5">
                        {tx.lines.map((line, i) => (
                          <div key={i} className="flex justify-between text-xs gap-2">
                            <span className="text-slate-600 truncate">{line.label}</span>
                            <span className="font-semibold text-slate-800 shrink-0">{formatRupiah(line.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="flex justify-between items-end gap-2">
                    <div>
                      <p className="text-[10px] text-slate-500 font-semibold uppercase">
                        {lang === 'en' ? 'Total payment' : 'Total pembayaran'}
                      </p>
                      <p className="text-lg font-bold text-primary">{formatRupiah(tx.totalAmount)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openTuitionReceiptPdf(tx.transactionId, tx.transactionCreatedAt)}
                      className="flex items-center gap-1.5 text-xs font-bold text-primary bg-primary-light px-3 py-2 rounded-xl border border-indigo-100 hover:bg-indigo-100 transition-colors"
                    >
                      <FileText size={14} />
                      {lang === 'en' ? 'Receipt PDF' : 'Kuitansi PDF'}
                    </button>
                  </div>
                </div>
              ))
            )
          ) : null}
        </div>

        {/* ===== Desktop: table ===== */}
        <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {tab === 'checkout' && pendingList.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-600">
              {lang === 'en'
                ? 'You have no payments waiting to be completed.'
                : 'Tidak ada pembayaran yang masih menunggu.'}
            </div>
          ) : tab === 'paid' && paidList.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-600">
              {lang === 'en' ? 'No successful payments yet.' : 'Belum ada pembayaran berhasil.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 border-b border-slate-200 bg-slate-50">
                    <th className="px-5 py-3 font-semibold">{lang === 'en' ? 'Date' : 'Tanggal'}</th>
                    <th className="px-5 py-3 font-semibold">{lang === 'en' ? 'Description' : 'Deskripsi'}</th>
                    <th className="px-5 py-3 font-semibold">{lang === 'en' ? 'Method' : 'Metode'}</th>
                    <th className="px-5 py-3 font-semibold">{lang === 'en' ? 'Details' : 'Rincian'}</th>
                    <th className="px-5 py-3 font-semibold text-right">{lang === 'en' ? 'Total' : 'Total'}</th>
                    <th className="px-5 py-3 font-semibold text-center">{lang === 'en' ? 'Status' : 'Status'}</th>
                    <th className="px-5 py-3 font-semibold text-center w-28" />
                  </tr>
                </thead>
                <tbody>
                  {currentList.map((tx) => {
                    const isPending = tab === 'checkout';
                    return (
                      <tr
                        key={`${tx.transactionId}-${tx.transactionCreatedAt}`}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="px-5 py-3 text-slate-600 whitespace-nowrap">{dateForTx(tx)}</td>
                        <td className="px-5 py-3 font-semibold text-slate-800">{buildTitle(tx, lang)}</td>
                        <td className="px-5 py-3 text-slate-500">{tx.paymentMethodName ?? '—'}</td>
                        <td className="px-5 py-3">
                          {tx.lines.length > 1 ? (
                            <div className="space-y-0.5">
                              {tx.lines.map((line, i) => (
                                <div key={i} className="flex justify-between text-xs gap-4">
                                  <span className="text-slate-600 truncate">{line.label}</span>
                                  <span className="font-semibold text-slate-700 shrink-0">{formatRupiah(line.amount)}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right font-bold text-primary whitespace-nowrap">{formatRupiah(tx.totalAmount)}</td>
                        <td className="px-5 py-3 text-center">
                          {isPending ? (
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                              {pendingStatusLabel}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                              {(tx.status ?? '').toUpperCase()}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-center">
                          {isPending ? (
                            <button
                              type="button"
                              onClick={() => goToInstruction(tx)}
                              className="text-xs font-bold text-primary hover:underline"
                            >
                              {lang === 'en' ? 'Instructions' : 'Instruksi'} →
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openTuitionReceiptPdf(tx.transactionId, tx.transactionCreatedAt)}
                              className="inline-flex items-center gap-1 text-xs font-bold text-primary bg-primary-light px-2.5 py-1.5 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-colors"
                            >
                              <FileText size={12} />
                              {lang === 'en' ? 'Receipt PDF' : 'Kuitansi PDF'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {currentHasMore ? (
          <button
            type="button"
            disabled={loadingMore}
            onClick={loadMore}
            className="w-full py-3 flex items-center justify-center gap-2 text-sm font-semibold text-primary bg-white rounded-2xl border border-slate-100 shadow-sm hover:bg-primary-light/30 transition-colors disabled:opacity-60"
          >
            {loadingMore ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {lang === 'en' ? 'Loading…' : 'Memuat…'}
              </>
            ) : (
              lang === 'en' ? 'Load more' : 'Muat lebih banyak'
            )}
          </button>
        ) : null}

        <Link href="/finance" className="block text-center text-sm font-semibold text-primary py-2">
          {lang === 'en' ? 'Back to tuition' : 'Kembali ke tuition'}
        </Link>
      </div>
    </div>
  );
}
