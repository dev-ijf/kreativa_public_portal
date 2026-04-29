"use client";

import Link from 'next/link';
import { Check } from 'lucide-react';
import { Header } from '@/components/portal/Header';
import type { FinanceInstallmentPaymentLine } from '@/lib/data/portal-finance-payload';
import { openTuitionReceiptPdf } from '@/lib/portal/tuition-receipt-url';
import { usePortalState } from '@/components/portal/state/PortalProvider';
import { formatRupiah } from '@/lib/utils/format';

type InstallmentHistoryPageClientProps = {
  productName: string;
  lines: FinanceInstallmentPaymentLine[];
};

function formatShortDate(iso: string, lang: 'en' | 'id'): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(lang === 'en' ? 'en-GB' : 'id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function InstallmentHistoryPageClient({ productName, lines }: InstallmentHistoryPageClientProps) {
  const { lang } = usePortalState();

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <Header title={lang === 'en' ? 'Installment history' : 'Riwayat cicilan'} backHref="/finance" />

      <div className="px-4 mt-4">
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
          <h2 className="font-bold text-slate-800 text-lg mb-0.5">{productName}</h2>
          <p className="text-xs text-slate-500 mb-4">{lang === 'en' ? 'Payment history' : 'Riwayat pembayaran'}</p>

          <div className="space-y-3">
            {lines.length === 0 ? (
              <p className="text-sm text-slate-600">{lang === 'en' ? 'No payments yet.' : 'Belum ada pembayaran.'}</p>
            ) : (
              lines.map((row, idx) => {
                const ok =
                  row.transactionStatus != null && String(row.transactionStatus).toLowerCase().trim() === 'success';
                return (
                  <div
                    key={`${row.transactionId}-${row.transactionCreatedAt}-${idx}`}
                    className="bg-slate-50 rounded-2xl p-3 border border-slate-100 flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={[
                            'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                            ok ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-white',
                          ].join(' ')}
                        >
                          <Check size={16} />
                        </span>
                        <span className="text-sm font-medium text-slate-800">{formatShortDate(row.date, lang)}</span>
                      </div>
                      <span className="font-bold text-slate-800 text-sm shrink-0">{formatRupiah(row.amount)}</span>
                    </div>
                    {ok && row.transactionId && row.transactionCreatedAt ? (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => openTuitionReceiptPdf(row.transactionId, row.transactionCreatedAt)}
                          className="text-[11px] font-bold text-primary bg-primary-light px-3 py-1.5 rounded-full border border-indigo-100 hover:bg-indigo-100"
                        >
                          {lang === 'en' ? 'Receipt PDF' : 'Kuitansi PDF'}
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>

          <Link href="/finance" className="block text-center text-sm font-semibold text-primary mt-6 py-1">
            {lang === 'en' ? 'Back to tuition' : 'Kembali ke keuangan'}
          </Link>
        </div>
      </div>
    </div>
  );
}
