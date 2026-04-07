"use client";

import Link from 'next/link';
import { usePortalState } from '@/components/portal/state/PortalProvider';
import { formatRupiah } from '@/lib/utils/format';

export function SuccessPageClient() {
  const { lang, cart, setCart, selectedPayment, setSelectedPayment } = usePortalState();
  const total = cart.reduce((sum, i) => sum + i.amount, 0);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6">
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-2xl">✅</div>
        <h1 className="text-xl font-bold text-slate-800 mt-4">{lang === 'en' ? 'Payment Successful!' : 'Pembayaran Berhasil!'}</h1>
        <p className="text-sm text-slate-600 mt-2">
          {lang === 'en'
            ? 'Thank you, your payment has been received and recorded in our system.'
            : 'Terima kasih, pembayaran kamu sudah kami terima dan tercatat di sistem.'}
        </p>

        <div className="mt-5 bg-slate-50 border border-slate-100 rounded-2xl p-4">
          <p className="text-xs text-slate-500 font-semibold">{lang === 'en' ? 'Transaction Details' : 'Detail Transaksi'}</p>
          <div className="flex items-center justify-between mt-2">
            <p className="text-sm text-slate-600">{lang === 'en' ? 'Payment Method' : 'Metode'}</p>
            <p className="text-sm font-bold text-slate-700">{selectedPayment?.label ?? '-'}</p>
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-sm text-slate-600">{lang === 'en' ? 'Total' : 'Total'}</p>
            <p className="text-sm font-bold text-primary">{formatRupiah(total)}</p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-200">
            <p className="text-xs text-slate-500 font-semibold mb-2">{lang === 'en' ? 'Items' : 'Item'}</p>
            <div className="space-y-2">
              {cart.map((i) => (
                <div key={i.id} className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-500 font-semibold">{i.childName}</p>
                    <p className="text-sm font-bold text-slate-700 leading-tight">{i.title}</p>
                  </div>
                  <p className="text-sm font-bold text-slate-700 shrink-0">{formatRupiah(i.amount)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Link href="/" className="inline-flex items-center justify-center bg-primary text-white font-bold px-4 py-3 rounded-full hover:bg-primary-hover">
            {lang === 'en' ? 'Back Home' : 'Kembali'}
          </Link>
          <button
            onClick={() => {
              setCart([]);
              setSelectedPayment(null);
            }}
            className="inline-flex items-center justify-center bg-white border border-slate-200 text-slate-700 font-bold px-4 py-3 rounded-full hover:bg-slate-50"
          >
            {lang === 'en' ? 'New Payment' : 'Bayar Lagi'}
          </button>
        </div>

        <button
          onClick={() => {
            setCart([]);
            setSelectedPayment(null);
          }}
          className="mt-3 w-full text-xs font-bold text-slate-500 hover:text-slate-700"
        >
          {lang === 'en' ? 'Reset cart (dev)' : 'Reset keranjang (dev)'}
        </button>
      </div>
    </div>
  );
}

