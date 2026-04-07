"use client";

import Link from 'next/link';
import { Header } from '@/components/portal/Header';
import { usePortalState } from '@/components/portal/state/PortalProvider';
import { formatRupiah } from '@/lib/utils/format';

export function PaymentMethodPageClient() {
  const { lang, cart, selectedPayment, setSelectedPayment } = usePortalState();
  const total = cart.reduce((sum, i) => sum + i.amount, 0);

  const methods = [
    { id: 'bca-va', label: 'BCA Virtual Account', sublabel: 'Auto verification', type: 'va' as const },
    { id: 'mandiri-va', label: 'Mandiri VA', sublabel: 'Auto verification', type: 'va' as const },
    { id: 'qris', label: 'QRIS', sublabel: 'Scan to pay', type: 'qris' as const },
    { id: 'manual', label: 'Manual Transfer', sublabel: 'Upload proof later', type: 'manual' as const },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-8">
      <Header title={lang === 'en' ? 'Payment Method' : 'Metode Pembayaran'} backHref="/cart" />

      <div className="px-4 pt-4 space-y-4">
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
          <p className="text-xs text-slate-500 font-semibold">{lang === 'en' ? 'Total Payment' : 'Total Pembayaran'}</p>
          <p className="text-2xl font-bold text-primary mt-1">{formatRupiah(total)}</p>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
          <p className="font-bold text-slate-700 mb-4">{lang === 'en' ? 'Choose Payment Method' : 'Pilih Metode Pembayaran'}</p>
          <div className="space-y-3">
            {methods.map((m) => {
              const active = selectedPayment?.id === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setSelectedPayment(m)}
                  className={[
                    'w-full p-4 rounded-2xl border flex items-center justify-between text-left transition-all',
                    active ? 'border-primary bg-primary-light shadow-sm' : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50',
                  ].join(' ')}
                >
                  <div className="flex items-center">
                    <div className={['w-10 h-10 rounded-full flex items-center justify-center mr-3', active ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'].join(' ')}>
                      <span className="text-sm">{m.type === 'va' ? '🏦' : m.type === 'qris' ? '📱' : '🧾'}</span>
                    </div>
                    <div>
                      <p className="font-bold text-slate-700">{m.label}</p>
                      {m.sublabel ? <p className="text-xs text-slate-500 mt-0.5">{m.sublabel}</p> : null}
                    </div>
                  </div>
                  <span className={['text-sm font-bold', active ? 'text-primary' : 'text-slate-400'].join(' ')}>{active ? '✓' : '○'}</span>
                </button>
              );
            })}
          </div>

          <Link
            href="/instruction"
            className={[
              'mt-4 w-full inline-flex items-center justify-center font-bold px-6 py-3 rounded-full transition-colors',
              selectedPayment ? 'bg-primary text-white hover:bg-primary-hover' : 'bg-slate-200 text-slate-500 pointer-events-none',
            ].join(' ')}
          >
            {lang === 'en' ? 'Proceed Payment' : 'Lanjut'} <span className="ml-2">›</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

