"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/portal/Header';
import { usePortalState } from '@/components/portal/state/PortalProvider';
import { formatRupiah } from '@/lib/utils/format';

export function InstructionPageClient() {
  const { lang, cart, selectedPayment } = usePortalState();
  const [copied, setCopied] = useState(false);

  const total = cart.reduce((sum, i) => sum + i.amount, 0);
  const vaNumber = '1234 5678 9012 3456';
  const deadline = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toLocaleDateString(lang === 'en' ? 'en-GB' : 'id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
  }, [lang]);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(id);
  }, [copied]);

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

        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
          <p className="font-bold text-slate-700 mb-2">{lang === 'en' ? 'VA Number' : 'Nomor VA'}</p>
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="font-bold text-slate-700 tracking-wider">{vaNumber}</p>
            <button
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
              {copied ? (lang === 'en' ? 'Copied' : 'Tersalin') : (lang === 'en' ? 'Copy' : 'Salin')}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
          <p className="font-bold text-slate-700 mb-3">{lang === 'en' ? 'How to Pay (BCA ATM)' : 'Cara Bayar (ATM BCA)'}</p>
          <ol className="space-y-2 text-sm text-slate-600 list-decimal list-inside">
            <li>{lang === 'en' ? 'Insert BCA ATM Card & PIN' : 'Masukkan kartu ATM BCA & PIN'}</li>
            <li>{lang === 'en' ? 'Other Transactions > Transfer > to BCA Virtual Account' : 'Transaksi Lainnya > Transfer > Ke Rek BCA Virtual Account'}</li>
            <li>{lang === 'en' ? 'Input the Virtual Account number above' : 'Masukkan nomor Virtual Account di atas'}</li>
            <li>{lang === 'en' ? 'Verify details, then confirm' : 'Cek detail, lalu konfirmasi'}</li>
            <li>{lang === 'en' ? 'Keep the receipt as proof' : 'Simpan struk sebagai bukti'}</li>
          </ol>
        </div>

        <Link href="/success" className="w-full inline-flex items-center justify-center bg-primary text-white font-bold px-6 py-3 rounded-full hover:bg-primary-hover">
          {lang === 'en' ? 'I Have Paid' : 'Saya Sudah Bayar'}
        </Link>
      </div>
    </div>
  );
}

