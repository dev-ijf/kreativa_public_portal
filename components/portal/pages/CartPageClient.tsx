"use client";

import Link from 'next/link';
import { Header } from '@/components/portal/Header';
import { usePortalState } from '@/components/portal/state/PortalProvider';
import { formatRupiah } from '@/lib/utils/format';

export function CartPageClient() {
  const { lang, cart, setCart, setSelectedPayment } = usePortalState();
  const total = cart.reduce((sum, i) => sum + i.amount, 0);

  return (
    <div className="min-h-screen bg-slate-50 pb-8">
      <Header title={lang === 'en' ? 'Payment Cart' : 'Keranjang'} backHref="/finance" />

      <div className="px-4 pt-4">
        {cart.length === 0 ? (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 text-center">
            <div className="text-3xl mb-3">🛒</div>
            <p className="font-bold text-slate-700">{lang === 'en' ? 'Empty Cart' : 'Keranjang Kosong'}</p>
            <p className="text-sm text-slate-500 mt-1">
              {lang === 'en'
                ? 'Please select tuition or installments from the Tuition menu first.'
                : 'Silakan pilih SPP atau cicilan terlebih dahulu dari menu Keuangan.'}
            </p>
            <Link href="/finance" className="inline-flex mt-4 bg-primary text-white font-bold px-6 py-2.5 rounded-full hover:bg-primary-hover">
              {lang === 'en' ? 'Go to Tuition' : 'Ke Keuangan'}
            </Link>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <p className="font-bold text-slate-700">{lang === 'en' ? 'Items' : 'Item'}</p>
                <button
                  onClick={() => {
                    setCart([]);
                    setSelectedPayment(null);
                  }}
                  className="text-xs font-bold text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-full"
                >
                  {lang === 'en' ? 'Clear' : 'Kosongkan'}
                </button>
              </div>

              <div className="space-y-3">
                {cart.map((item) => (
                  <div key={item.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-slate-500 font-semibold">{item.childName}</p>
                      <p className="font-bold text-slate-700 text-sm leading-tight mt-0.5">{item.title}</p>
                      <p className="text-xs text-slate-500 mt-1">{item.type}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-slate-700">{formatRupiah(item.amount)}</p>
                      <button
                        onClick={() => setCart((prev) => prev.filter((x) => x.id !== item.id))}
                        className="text-[10px] font-bold text-red-500 px-3 py-1.5 bg-white border border-red-100 rounded-xl hover:bg-red-50 mt-2"
                      >
                        {lang === 'en' ? 'Remove' : 'Hapus'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 mt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600 font-semibold">{lang === 'en' ? 'Total Due' : 'Total Bayar'}</p>
                <p className="text-lg font-bold text-primary">{formatRupiah(total)}</p>
              </div>
              <Link
                href="/payment-method"
                onClick={() => setSelectedPayment(null)}
                className="mt-4 w-full inline-flex items-center justify-center bg-primary text-white font-bold px-6 py-3 rounded-full hover:bg-primary-hover transition-colors"
              >
                {lang === 'en' ? 'Proceed Payment' : 'Lanjut Pembayaran'} <span className="ml-2">›</span>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

