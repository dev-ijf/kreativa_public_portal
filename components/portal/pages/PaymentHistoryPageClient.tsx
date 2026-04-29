"use client";

import Link from 'next/link';
import { Calendar, FileText } from 'lucide-react';
import { Header } from '@/components/portal/Header';
import { ChildSelector } from '@/components/portal/ChildSelector';
import { usePortalState } from '@/components/portal/state/PortalProvider';
import type { PortalTuitionTransaction } from '@/lib/data/server/finance-transactions';
import { openTuitionReceiptPdf } from '@/lib/portal/tuition-receipt-url';
import { formatRupiah } from '@/lib/utils/format';

type PaymentHistoryPageClientProps = {
  initialByChildId: Record<number, PortalTuitionTransaction[]>;
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

export function PaymentHistoryPageClient({ initialByChildId }: PaymentHistoryPageClientProps) {
  const { lang, activeChildId } = usePortalState();
  const list = initialByChildId[activeChildId] ?? [];

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <Header title={lang === 'en' ? 'Payment History' : 'Riwayat Pembayaran'} backHref="/finance" />
      <ChildSelector />

      <div className="px-4 mt-2 space-y-4">
        {list.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 border border-slate-100 text-center text-sm text-slate-600">
            {lang === 'en' ? 'No successful payments yet.' : 'Belum ada pembayaran berhasil.'}
          </div>
        ) : (
          list.map((tx) => {
            const titleParts = tx.lines.map((l) => l.label);
            const title =
              titleParts.length <= 1
                ? titleParts[0] ?? (lang === 'en' ? 'Payment' : 'Pembayaran')
                : titleParts.slice(0, 2).join(' & ') +
                  (titleParts.length > 2 ? ` +${titleParts.length - 2}` : '');

            return (
              <div
                key={`${tx.transactionId}-${tx.transactionCreatedAt}`}
                className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100"
              >
                <div className="flex justify-between items-start gap-2 mb-2">
                  <div className="flex items-center gap-2 text-slate-600 text-xs min-w-0">
                    <Calendar size={14} className="shrink-0" />
                    <span className="truncate">{formatDateTime(tx.paymentDate ?? tx.transactionCreatedAt, lang)}</span>
                  </div>
                  <span className="shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {tx.status}
                  </span>
                </div>
                <p className="font-bold text-slate-800 text-sm mb-0.5">{title}</p>
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
            );
          })
        )}

        <Link
          href="/finance"
          className="block text-center text-sm font-semibold text-primary py-2"
        >
          {lang === 'en' ? 'Back to tuition' : 'Kembali ke keuangan'}
        </Link>
      </div>
    </div>
  );
}
