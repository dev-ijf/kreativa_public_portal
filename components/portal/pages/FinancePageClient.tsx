"use client";

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AlertCircle, ShoppingCart, Wallet } from 'lucide-react';
import { Header } from '@/components/portal/Header';
import { FloatingCartBar } from '@/components/portal/FloatingCartBar';
import { ProgressRing } from '@/components/portal/ProgressRing';
import { ChildSelector } from '@/components/portal/ChildSelector';
import { usePortalState, useActiveChild } from '@/components/portal/state/PortalProvider';
import { emptyFinanceChildPayload, type FinanceChildPayload } from '@/lib/data/portal-finance-payload';
import { formatInputNumber, formatRupiah } from '@/lib/utils/format';

type FinancePageClientProps = {
  financeByChildId?: Record<number, FinanceChildPayload>;
};

export function FinancePageClient({ financeByChildId = {} }: FinancePageClientProps) {
  const { lang, activeChildId, cart, setCart } = usePortalState();
  const activeChild = useActiveChild();
  const [installmentInputs, setInstallmentInputs] = useState<Record<string, number>>({});

  const childName = activeChild?.fullName ?? '';
  const finance = financeByChildId[activeChildId] ?? emptyFinanceChildPayload();
  const tuitionMonths = finance.months;
  const installments = finance.installments;
  const prevBills = finance.previous;

  const totalOutstanding = useMemo(() => {
    const tuitionUnpaid = tuitionMonths.filter((m) => m.status === 'unpaid' && m.billId).reduce((s, m) => s + m.amount, 0);
    const instUnpaid = installments.reduce((s, i) => s + (i.total - i.paid), 0);
    const prevUnpaid = prevBills.reduce((s, b) => s + b.amount, 0);
    return tuitionUnpaid + instUnpaid + prevUnpaid;
  }, [tuitionMonths, installments, prevBills]);

  const toggleTuitionToCart = (billId: string, label: string, amount: number) => {
    const id = `spp-${activeChildId}-${billId}`;
    setCart((prev) => (prev.some((i) => i.id === id) ? prev.filter((i) => i.id !== id) : [...prev, { id, childId: activeChildId, childName: childName, type: 'tuition', title: label, amount }]));
  };

  const togglePrevBillToCart = (billId: string, title: string, amount: number) => {
    const id = `prev-${activeChildId}-${billId}`;
    setCart((prev) => (prev.some((i) => i.id === id) ? prev.filter((i) => i.id !== id) : [...prev, { id, childId: activeChildId, childName: childName, type: 'previous', title, amount }]));
  };

  const addInstallmentToCart = (instId: string, title: string, amount: number) => {
    const id = `inst-${instId}`;
    setCart((prev) => [...prev, { id, childId: activeChildId, childName: childName, type: 'installment', title, amount }]);
  };

  const removeFromCart = (id: string) => setCart((prev) => prev.filter((i) => i.id !== id));

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <Header
        title={lang === 'en' ? 'Tuition' : 'Keuangan'}
        backHref="/"
        rightSlot={
          <Link href="/cart" className="relative p-2 rounded-full hover:bg-slate-100 text-slate-700" aria-label="Cart">
            <ShoppingCart size={20} />
            {cart.length > 0 ? (
              <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white">
                {cart.length}
              </span>
            ) : null}
          </Link>
        }
      />

      <ChildSelector />

      <div className="px-4 mb-6 mt-2">
        <div className="bg-primary rounded-3xl p-5 shadow-lg shadow-primary/25 flex flex-col relative overflow-hidden text-white">
          <div className="flex justify-between items-center mb-4 relative z-10">
            <div className="flex items-center font-bold">
              <Wallet size={20} className="mr-2 text-white/70" />
              {lang === 'en' ? 'Tuition' : 'Keuangan'}
            </div>
          </div>
          <div className="flex justify-between items-end relative z-10">
            <div>
              <p className="text-xs text-white/70 font-semibold mb-1">
                {lang === 'en' ? 'Total Outstanding' : 'Total Tertunggak'} ({childName.split(' ')[0]})
              </p>
              <p className="text-3xl font-bold text-white">{formatRupiah(totalOutstanding)}</p>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-10 -mt-10" />
          <div className="absolute bottom-0 right-10 w-20 h-20 bg-white opacity-5 rounded-full -mb-10" />
        </div>
      </div>

      <div className="px-4 space-y-6">
        {prevBills.length > 0 ? (
          <div className="bg-red-50 rounded-3xl p-5 shadow-sm border border-red-100">
            <div className="flex items-center mb-4">
              <AlertCircle size={18} className="text-red-500 mr-2" />
              <h2 className="font-bold text-red-700 text-lg">{lang === 'en' ? 'Past Due (Previous AY)' : 'Tunggakan (Tahun Ajaran Lalu)'}</h2>
            </div>
            <div className="space-y-3">
              {prevBills.map((bill) => {
                const id = `prev-${activeChildId}-${bill.id}`;
                const isInCart = cart.some((i) => i.id === id);
                const title = lang === 'en' ? bill.titleEn : bill.titleId;
                return (
                  <div key={bill.id} className={['p-4 rounded-2xl flex items-center justify-between border transition-all', isInCart ? 'bg-primary-light border-indigo-200' : 'bg-white border-red-100'].join(' ')}>
                    <div>
                      <p className="font-bold text-slate-700 text-sm mb-0.5">{title}</p>
                      <p className="text-xs text-slate-500">AY {bill.ay}</p>
                    </div>
                    <div className="flex items-center space-x-3 text-right">
                      <p className={['font-bold text-sm', isInCart ? 'text-primary' : 'text-slate-700'].join(' ')}>{formatRupiah(bill.amount)}</p>
                      <button
                        onClick={() => togglePrevBillToCart(bill.id, title, bill.amount)}
                        className={['w-8 h-8 rounded-full flex items-center justify-center transition-all', isInCart ? 'bg-primary text-white shadow-md' : 'bg-red-100 text-red-600 hover:bg-red-200'].join(' ')}
                        aria-label={isInCart ? 'Remove from cart' : 'Add to cart'}
                      >
                        {isInCart ? '✅' : <ShoppingCart size={14} />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-5">
            <h2 className="font-bold text-slate-700 text-lg">{lang === 'en' ? 'Digital Tuition Card' : 'Kartu SPP Digital'}</h2>
            <span className="text-xs font-bold bg-primary-light text-primary px-2.5 py-1 rounded-md">
              {finance.academicYearLabel ? `AY ${finance.academicYearLabel}` : '—'}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2.5">
            {tuitionMonths.map((m) => {
              const hasBill = m.billId != null;
              const id = hasBill ? `spp-${activeChildId}-${m.billId}` : `spp-${activeChildId}-${m.monthKey}-empty`;
              const isInCart = hasBill && cart.some((i) => i.id === id);
              const isPaid = m.status === 'paid';
              const noBill = !hasBill;
              const label = lang === 'en' ? m.monthLabelEn : m.monthLabelId;
              const title = `${lang === 'en' ? 'Tuition' : 'SPP'} ${label}`;
              const btnClass = [
                'flex flex-col items-center justify-center py-2 px-1 rounded-2xl border transition-all relative overflow-hidden',
                noBill || isPaid
                  ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed opacity-80'
                  : isInCart
                    ? 'bg-primary border-primary text-white shadow-md shadow-primary/25 scale-[1.03]'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-400',
              ].join(' ');
              return (
                <button
                  key={m.monthKey}
                  disabled={noBill || isPaid}
                  onClick={() => {
                    if (m.billId) toggleTuitionToCart(m.billId, title, m.amount);
                  }}
                  className={btnClass}
                >
                  <span className="text-xs font-bold mb-1">{label}</span>
                  <span className="mb-1">{isPaid ? '✅' : noBill ? '—' : isInCart ? <ShoppingCart size={16} className="text-white" /> : '○'}</span>
                  <span className={['text-[9px] font-semibold', isInCart ? 'text-white/80' : 'text-slate-400'].join(' ')}>
                    {noBill ? '—' : formatRupiah(m.amount)}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-slate-500 mt-5 flex items-center bg-slate-50 p-2 rounded-lg">
            <span className="mr-2 text-primary shrink-0">ℹ️</span> {lang === 'en' ? 'Tap unpaid months to add to cart.' : 'Tap bulan yang belum bayar untuk menambah ke keranjang.'}
          </p>
        </div>

        <div>
          <h2 className="font-bold text-slate-700 mb-3 px-1 text-lg">{lang === 'en' ? 'Pending Installments' : 'Cicilan'}</h2>
          <div className="space-y-4">
            {installments.map((inst) => {
              const cartId = `inst-${inst.id}`;
              const cartItem = cart.find((i) => i.id === cartId);
              const progressPercentage = inst.total === 0 ? 0 : (inst.paid / inst.total) * 100;
              const remaining = inst.total - inst.paid;
              const instFloor = inst.minPayment > 0 ? inst.minPayment : remaining > 0 ? 1 : 0;
              const defaultInput = installmentInputs[inst.id] ?? instFloor;
              const name = lang === 'en' ? inst.nameEn : inst.nameId;

              return (
                <div key={inst.id} className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                  <div className="flex justify-between items-start mb-5">
                    <span className="font-bold text-slate-700 text-lg">{name}</span>
                    {inst.paymentHistory.length > 0 ? (
                      <button className="text-[10px] font-bold text-primary hover:bg-indigo-100 flex items-center bg-primary-light px-2.5 py-1.5 rounded-full transition-colors" disabled>
                        {lang === 'en' ? 'Installment History' : 'Riwayat Cicilan'} <span className="ml-1">›</span>
                      </button>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center shrink-0 w-1/3 border-r border-slate-100 pr-2">
                      <ProgressRing percentage={progressPercentage} />
                      <div className="mt-2 text-center w-full">
                        <p className="text-[10px] text-slate-500 leading-tight">{lang === 'en' ? 'Left' : 'Sisa'}</p>
                        <p className="text-xs font-bold text-slate-700 leading-tight">{formatRupiah(remaining)}</p>
                      </div>
                    </div>

                    <div className="w-2/3 flex flex-col justify-center">
                      {remaining === 0 ? (
                        <div className="bg-emerald-50 text-emerald-700 text-sm p-3 rounded-xl flex items-center justify-center font-bold">
                          <span className="mr-2">✅</span> {lang === 'en' ? 'Fully Paid' : 'Lunas'}
                        </div>
                      ) : cartItem ? (
                        <div className="bg-primary-light border border-indigo-200 p-3 rounded-2xl flex flex-col justify-center items-center h-full space-y-2">
                          <div className="text-center">
                            <p className="text-[10px] text-primary font-bold mb-0.5">{lang === 'en' ? 'In Cart' : 'Di Keranjang'}</p>
                            <p className="font-bold text-slate-700 text-sm">{formatRupiah(cartItem.amount)}</p>
                          </div>
                          <button onClick={() => removeFromCart(cartId)} className="text-[10px] font-bold text-red-500 px-4 py-1.5 bg-white border border-red-100 rounded-xl hover:bg-red-50 w-full">
                            {lang === 'en' ? 'Cancel' : 'Batal'}
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col h-full justify-center">
                          <p className="text-[10px] text-slate-500 mb-1.5 font-semibold">
                            {lang === 'en' ? 'Pay Amount' : 'Nominal Bayar'} ({lang === 'en' ? 'Min.' : 'Min.'}{' '}
                            {formatRupiah(instFloor)})
                          </p>
                          <div className="relative w-full mb-2">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">Rp</span>
                            <input
                              type="text"
                              inputMode="numeric"
                              aria-label={lang === 'en' ? `Pay amount for ${name}` : `Nominal bayar untuk ${name}`}
                              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white text-right"
                              value={formatInputNumber(defaultInput)}
                              onChange={(e) => {
                                const raw = e.target.value.replace(/\D/g, '');
                                const next = raw ? Number(raw) : 0;
                                setInstallmentInputs((p) => ({ ...p, [inst.id]: next }));
                              }}
                            />
                          </div>
                          <button
                            onClick={() => {
                              const floor = inst.minPayment > 0 ? inst.minPayment : remaining > 0 ? 1 : 0;
                              const input = installmentInputs[inst.id] ?? floor;
                              const finalAmount = Math.min(Math.max(input, floor), remaining);
                              addInstallmentToCart(inst.id, name, finalAmount);
                            }}
                            className="bg-slate-700 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-600 transition-colors w-full"
                          >
                            {lang === 'en' ? 'Add' : 'Tambah'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {installments.length === 0 ? (
              <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 text-sm text-slate-600">
                {lang === 'en' ? 'No installments found.' : 'Tidak ada cicilan.'}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <FloatingCartBar />
    </div>
  );
}

