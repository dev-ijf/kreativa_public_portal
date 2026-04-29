"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { Calendar, FileText } from 'lucide-react';
import { Header } from '@/components/portal/Header';
import { ChildSelector } from '@/components/portal/ChildSelector';
import { usePortalState } from '@/components/portal/state/PortalProvider';
import { persistPortalSessionForPendingInstruction } from '@/lib/portal/instruction-from-payment-history';
import type { PortalTuitionTransaction } from '@/lib/data/server/finance-transactions';
import { openTuitionReceiptPdf } from '@/lib/portal/tuition-receipt-url';
import { formatRupiah } from '@/lib/utils/format';

type PaymentHistoryPageClientProps = {
  initialPaidByChildId: Record<number, PortalTuitionTransaction[]>;
  initialPendingByChildId: Record<number, PortalTuitionTransaction[]>;
};

function formatDateTime(iso: string | null, lang: 'en' | 'id'): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 16);
  return d.toLocaleString(lang === 'en' ? 'en-GB' : 'id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function buildTitle(tx: PortalTuitionTransaction, lang: 'en' | 'id'): string {
  const titleParts = tx.lines.map((l) => l.label);
  if (titleParts.length <= 1) {
    return titleParts[0] ?? (lang === 'en' ? 'Payment' : 'Pembayaran');
  }
  return (
    titleParts.slice(0, 2).join(' & ') + (titleParts.length > 2 ? ` +${titleParts.length - 2}` : '')
  );
}

export function PaymentHistoryPageClient({
  initialPaidByChildId,
  initialPendingByChildId,
}: PaymentHistoryPageClientProps) {
  const router = useRouter();
  const { lang, activeChildId, setSelectedPayment } = usePortalState();
  const [tab, setTab] = useState<'checkout' | 'paid'>('paid');

  const paidList = initialPaidByChildId[activeChildId] ?? [];
  const pendingList = initialPendingByChildId[activeChildId] ?? [];

  const goToInstruction = useCallback(
    (tx: PortalTuitionTransaction) => {
      const pm = persistPortalSessionForPendingInstruction(tx);
      setSelectedPayment(pm);
      router.push('/instruction');
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

  const showCheckoutTabInfo = pendingList.length === 0;

  const pendingStatusLabel = lang === 'en' ? 'Pending' : 'Menunggu';

  const dateForTx = (tx: PortalTuitionTransaction) =>
    tab === 'checkout' ? formatDateTime(tx.transactionCreatedAt, lang) : formatDateTime(tx.paymentDate ?? tx.transactionCreatedAt, lang);

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <Header title={lang === 'en' ? 'Payment History' : 'Riwayat Pembayaran'} backHref="/finance" />
      <ChildSelector />

      <div className="px-4 mt-2 space-y-4">
        <div className="flex gap-2 p-1 bg-white rounded-2xl border border-slate-100 shadow-sm">
          {tabBtn('checkout', 'Checkout', 'Menunggu bayar')}
          {tabBtn('paid', 'Paid', 'Berhasil')}
        </div>

        {tab === 'checkout' && showCheckoutTabInfo ? (
          <div className="bg-white rounded-2xl p-6 border border-slate-100 text-center text-sm text-slate-600">
            {lang === 'en'
              ? 'You have no payments waiting to be completed. New checkouts will appear here after you choose a payment method.'
              : 'Tidak ada pembayaran yang masih menunggu. Transaksi checkout baru akan muncul di sini setelah Anda memilih metode bayar.'}
          </div>
        ) : null}

        {tab === 'checkout' && !showCheckoutTabInfo
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

        <Link href="/finance" className="block text-center text-sm font-semibold text-primary py-2">
          {lang === 'en' ? 'Back to tuition' : 'Kembali ke tuition'}
        </Link>
      </div>
    </div>
  );
}
