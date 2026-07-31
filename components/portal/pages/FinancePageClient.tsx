"use client";

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AlertCircle, ChevronRight, History, ShoppingCart, Wallet } from 'lucide-react';
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
  const isKreativa = finance.billingMode === 'kreativa';
  const tuitionMonths = finance.months;
  const payableBills = finance.payableBills;
  const installments = finance.installments;
  const installmentGroups = finance.installmentGroups;
  const prevBills = finance.previous;

  const totalOutstanding = useMemo(() => {
    const prevUnpaid = prevBills.reduce((s, b) => s + b.amount, 0);
    if (isKreativa) {
      // Unique payable bill balances only (card + previous). Do not add group remaining.
      const currentUnpaid = payableBills.reduce((s, b) => s + b.amount, 0);
      return currentUnpaid + prevUnpaid;
    }
    const tuitionUnpaid = tuitionMonths.filter((m) => m.status === 'unpaid' && m.billId).reduce((s, m) => s + m.amount, 0);
    const instUnpaid = installments.reduce((s, i) => s + (i.total - i.paid), 0);
    return tuitionUnpaid + instUnpaid + prevUnpaid;
  }, [isKreativa, payableBills, tuitionMonths, installments, prevBills]);

  const toggleTuitionToCart = (billId: string, label: string, amount: number) => {
    const id = `spp-${activeChildId}-${billId}`;
    setCart((prev) =>
      prev.some((i) => i.id === id)
        ? prev.filter((i) => i.id !== id)
        : [...prev, { id, childId: activeChildId, childName: childName, type: 'tuition', title: label, amount }],
    );
  };

  const togglePrevBillToCart = (billId: string, title: string, amount: number) => {
    const id = `prev-${activeChildId}-${billId}`;
    setCart((prev) =>
      prev.some((i) => i.id === id)
        ? prev.filter((i) => i.id !== id)
        : [...prev, { id, childId: activeChildId, childName: childName, type: 'previous', title, amount }],
    );
  };

  const addInstallmentToCart = (instId: string, title: string, amount: number) => {
    const id = `inst-${instId}`;
    setCart((prev) => [...prev, { id, childId: activeChildId, childName: childName, type: 'installment', title, amount }]);
  };

  const removeFromCart = (id: string) => setCart((prev) => prev.filter((i) => i.id !== id));

  const groupHistoryHref = (groupId: string) => {
    if (groupId.startsWith('bill-')) {
      return `/finance/installments/${groupId.slice('bill-'.length)}/history`;
    }
    return `/finance/installments/group/${groupId}/history`;
  };

  /** Under a group card, shorten "DSP 26-27 - Termin 1/3" → "Termin 1/3". */
  const terminLabel = (groupName: string, title: string) => {
    const prefix = `${groupName} - `;
    if (title.startsWith(prefix)) return title.slice(prefix.length);
    return title;
  };

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

      <div className="px-4 md:px-6 space-y-6 mt-2">
        <div
          className={
            isKreativa
              ? 'space-y-4'
              : 'md:grid md:grid-cols-2 md:gap-6 md:items-stretch space-y-6 md:space-y-0'
          }
        >
          <div className="space-y-4 flex flex-col">
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

            <Link
              href="/finance/payment-history"
              className="flex items-center bg-white rounded-3xl p-4 shadow-sm border border-slate-100 hover:border-indigo-200 transition-colors"
            >
              <div className="w-11 h-11 rounded-full bg-primary-light flex items-center justify-center text-primary mr-3 shrink-0">
                <History size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800">{lang === 'en' ? 'Payment history' : 'Riwayat pembayaran'}</p>
                <p className="text-xs text-slate-500">
                  {lang === 'en' ? 'View past successful transactions' : 'Lihat transaksi berhasil sebelumnya'}
                </p>
              </div>
              <ChevronRight className="text-slate-400 shrink-0" size={20} />
            </Link>

            {prevBills.length > 0 ? (
              <div className="bg-red-50 rounded-3xl p-5 shadow-sm border border-red-100 flex-1">
                <div className="flex items-center justify-between mb-4 gap-2">
                  <div className="flex items-center min-w-0">
                    <AlertCircle size={18} className="text-red-500 mr-2 shrink-0" />
                    <h2 className="font-bold text-red-700 text-lg truncate">
                      {lang === 'en' ? 'Past Due (Previous AY)' : 'Tunggakan (Tahun Ajaran Lalu)'}
                    </h2>
                  </div>
                  {prevBills.length > 3 ? (
                    <Link
                      href="/finance/past-due"
                      className="text-xs font-bold text-red-700 whitespace-nowrap shrink-0 hover:underline"
                    >
                      {lang === 'en' ? 'View more' : 'Lihat semua'}
                    </Link>
                  ) : null}
                </div>

                <div className="space-y-3 md:hidden">
                  {prevBills.slice(0, 3).map((bill) => {
                    const id = `prev-${activeChildId}-${bill.id}`;
                    const isInCart = cart.some((i) => i.id === id);
                    const title = lang === 'en' ? bill.titleEn : bill.titleId;
                    return (
                      <div
                        key={bill.id}
                        className={[
                          'p-4 rounded-2xl flex items-center justify-between border transition-all',
                          isInCart ? 'bg-primary-light border-indigo-200' : 'bg-white border-red-100',
                        ].join(' ')}
                      >
                        <div>
                          <p className="font-bold text-slate-700 text-sm mb-0.5">{title}</p>
                          <p className="text-xs text-slate-500">AY {bill.ay}</p>
                        </div>
                        <div className="flex items-center space-x-3 text-right">
                          <p className={['font-bold text-sm', isInCart ? 'text-primary' : 'text-slate-700'].join(' ')}>
                            {formatRupiah(bill.amount)}
                          </p>
                          <button
                            onClick={() => togglePrevBillToCart(bill.id, title, bill.amount)}
                            className={[
                              'w-8 h-8 rounded-full flex items-center justify-center transition-all',
                              isInCart ? 'bg-primary text-white shadow-md' : 'bg-red-100 text-red-600 hover:bg-red-200',
                            ].join(' ')}
                            aria-label={isInCart ? 'Remove from cart' : 'Add to cart'}
                          >
                            {isInCart ? '✅' : <ShoppingCart size={14} />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-500 border-b border-red-200">
                        <th className="pb-2 font-semibold">{lang === 'en' ? 'Description' : 'Deskripsi'}</th>
                        <th className="pb-2 font-semibold">{lang === 'en' ? 'Acad. Year' : 'Tahun Ajaran'}</th>
                        <th className="pb-2 font-semibold text-right">{lang === 'en' ? 'Amount' : 'Jumlah'}</th>
                        <th className="pb-2 font-semibold text-center w-20" />
                      </tr>
                    </thead>
                    <tbody>
                      {prevBills.slice(0, 3).map((bill) => {
                        const id = `prev-${activeChildId}-${bill.id}`;
                        const isInCart = cart.some((i) => i.id === id);
                        const title = lang === 'en' ? bill.titleEn : bill.titleId;
                        return (
                          <tr
                            key={bill.id}
                            className={[
                              'border-b border-red-100 last:border-0 transition-colors',
                              isInCart ? 'bg-primary-light/50' : '',
                            ].join(' ')}
                          >
                            <td className="py-3 font-semibold text-slate-700">{title}</td>
                            <td className="py-3 text-slate-500">{bill.ay}</td>
                            <td
                              className={[
                                'py-3 text-right font-bold',
                                isInCart ? 'text-primary' : 'text-slate-700',
                              ].join(' ')}
                            >
                              {formatRupiah(bill.amount)}
                            </td>
                            <td className="py-3 text-center">
                              <button
                                onClick={() => togglePrevBillToCart(bill.id, title, bill.amount)}
                                className={[
                                  'w-8 h-8 rounded-full inline-flex items-center justify-center transition-all',
                                  isInCart
                                    ? 'bg-primary text-white shadow-md'
                                    : 'bg-red-100 text-red-600 hover:bg-red-200',
                                ].join(' ')}
                                aria-label={isInCart ? 'Remove from cart' : 'Add to cart'}
                              >
                                {isInCart ? '✅' : <ShoppingCart size={14} />}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>

          {/* Talenta only: Digital Tuition Card (Kreativa pakai Installments by bill group). */}
          {!isKreativa ? (
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col">
              <div className="flex justify-between items-center mb-5">
                <h2 className="font-bold text-slate-700 text-lg">
                  {lang === 'en' ? 'Digital Tuition Card' : 'Kartu SPP Digital'}
                </h2>
                <span className="text-xs font-bold bg-primary-light text-primary px-2.5 py-1 rounded-md">
                  {finance.academicYearLabel ? `AY ${finance.academicYearLabel}` : '—'}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2.5 md:hidden">
                {tuitionMonths.map((m) => {
                  const hasBill = m.billId != null;
                  const id = hasBill
                    ? `spp-${activeChildId}-${m.billId}`
                    : `spp-${activeChildId}-${m.monthKey}-empty`;
                  const isInCart = hasBill && cart.some((i) => i.id === id);
                  const isPaid = m.status === 'paid';
                  const noBill = !hasBill;
                  const labelBase = lang === 'en' ? m.monthLabelEn : m.monthLabelId;
                  const label = m.calendarYear != null ? `${labelBase} ${m.calendarYear}` : labelBase;
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
                      type="button"
                      disabled={noBill || isPaid}
                      onClick={() => {
                        if (m.billId) toggleTuitionToCart(m.billId, title, m.amount);
                      }}
                      className={btnClass}
                    >
                      <span className="text-[10px] sm:text-xs font-bold mb-1 text-center leading-tight px-0.5">
                        {label}
                      </span>
                      <span className="mb-1">
                        {isPaid ? '✅' : noBill ? '—' : isInCart ? <ShoppingCart size={16} className="text-white" /> : '○'}
                      </span>
                      <span
                        className={['text-[9px] font-semibold', isInCart ? 'text-white/80' : 'text-slate-400'].join(
                          ' ',
                        )}
                      >
                        {noBill ? '—' : formatRupiah(m.amount)}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="hidden md:block overflow-y-auto flex-1" style={{ maxHeight: '420px' }}>
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                      <th className="pb-2 font-semibold">{lang === 'en' ? 'Month' : 'Bulan'}</th>
                      <th className="pb-2 font-semibold text-right">{lang === 'en' ? 'Amount' : 'Jumlah'}</th>
                      <th className="pb-2 font-semibold text-center">{lang === 'en' ? 'Status' : 'Status'}</th>
                      <th className="pb-2 font-semibold text-center w-20" />
                    </tr>
                  </thead>
                  <tbody>
                    {tuitionMonths.map((m) => {
                      const hasBill = m.billId != null;
                      const id = hasBill
                        ? `spp-${activeChildId}-${m.billId}`
                        : `spp-${activeChildId}-${m.monthKey}-empty`;
                      const isInCart = hasBill && cart.some((i) => i.id === id);
                      const isPaid = m.status === 'paid';
                      const noBill = !hasBill;
                      const labelBase = lang === 'en' ? m.monthLabelEn : m.monthLabelId;
                      const label = m.calendarYear != null ? `${labelBase} ${m.calendarYear}` : labelBase;
                      const title = `${lang === 'en' ? 'Tuition' : 'SPP'} ${label}`;
                      return (
                        <tr
                          key={m.monthKey}
                          className={[
                            'border-b border-slate-100 last:border-0 transition-colors',
                            isInCart ? 'bg-primary-light/50' : '',
                          ].join(' ')}
                        >
                          <td className="py-2.5 font-semibold text-slate-700">{label}</td>
                          <td
                            className={[
                              'py-2.5 text-right font-bold',
                              noBill ? 'text-slate-400' : isInCart ? 'text-primary' : 'text-slate-700',
                            ].join(' ')}
                          >
                            {noBill ? '—' : formatRupiah(m.amount)}
                          </td>
                          <td className="py-2.5 text-center">
                            {isPaid ? (
                              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                                {lang === 'en' ? 'Paid' : 'Lunas'}
                              </span>
                            ) : noBill ? (
                              <span className="text-xs text-slate-400">—</span>
                            ) : isInCart ? (
                              <span className="text-xs font-bold text-primary bg-primary-light px-2 py-0.5 rounded-full">
                                {lang === 'en' ? 'In Cart' : 'Keranjang'}
                              </span>
                            ) : (
                              <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                                {lang === 'en' ? 'Unpaid' : 'Belum'}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 text-center">
                            {!noBill && !isPaid ? (
                              <button
                                type="button"
                                onClick={() => {
                                  if (m.billId) toggleTuitionToCart(m.billId, title, m.amount);
                                }}
                                className={[
                                  'w-8 h-8 rounded-full inline-flex items-center justify-center transition-all',
                                  isInCart
                                    ? 'bg-primary text-white shadow-md'
                                    : 'bg-slate-100 text-slate-500 hover:bg-indigo-100 hover:text-primary',
                                ].join(' ')}
                                aria-label={isInCart ? 'Remove from cart' : 'Add to cart'}
                              >
                                {isInCart ? '✅' : <ShoppingCart size={14} />}
                              </button>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-slate-500 mt-5 flex items-center bg-slate-50 p-2 rounded-lg">
                <span className="mr-2 text-primary shrink-0">ℹ️</span>{' '}
                {lang === 'en'
                  ? 'Tap unpaid months to add to cart.'
                  : 'Tap bulan yang belum bayar untuk menambah ke keranjang.'}
              </p>
            </div>
          ) : null}
        </div>

        <div>
          <div className="flex items-center justify-between gap-2 mb-3 px-1">
            <h2 className="font-bold text-slate-700 text-lg" suppressHydrationWarning>
              {isKreativa
                ? lang === 'en'
                  ? 'Bills & installments'
                  : 'Tagihan & cicilan'
                : lang === 'en'
                  ? 'Installments & other fees'
                  : 'Cicilan & biaya lain'}
            </h2>
            {isKreativa && finance.academicYearLabel ? (
              <span className="text-xs font-bold bg-primary-light text-primary px-2.5 py-1 rounded-md shrink-0">
                AY {finance.academicYearLabel}
              </span>
            ) : null}
          </div>

          {isKreativa ? (
            <>
              <div className="space-y-4 md:hidden">
                {installmentGroups.map((group) => {
                  const remaining = Math.max(0, group.total - group.paid);
                  const isFullyPaid = group.isFullyPaid || (group.total > 0 && remaining === 0);
                  const progressPercentage =
                    group.total === 0 ? 0 : Math.min(100, (group.paid / group.total) * 100);
                  const name = lang === 'en' ? group.nameEn : group.nameId;
                  const showDonut = group.isInstallment;

                  const terminButtons =
                    isFullyPaid ? (
                      <div className="bg-emerald-50 text-emerald-800 text-sm p-3 rounded-xl flex flex-col gap-1 font-bold">
                        <span className="flex items-center">
                          <span className="mr-2">✅</span> {lang === 'en' ? 'Fully paid' : 'Sudah lunas'}
                        </span>
                      </div>
                    ) : group.termins.length === 0 ? (
                      <p className="text-xs text-slate-500">
                        {lang === 'en' ? 'No open bills.' : 'Tidak ada tagihan terbuka.'}
                      </p>
                    ) : (
                      group.termins.map((termin) => {
                        const cartId = `spp-${activeChildId}-${termin.billId}`;
                        const isInCart = cart.some((i) => i.id === cartId);
                        return (
                          <button
                            key={termin.billId}
                            type="button"
                            onClick={() => toggleTuitionToCart(termin.billId, termin.title, termin.amount)}
                            className={[
                              'w-full text-left p-3 rounded-2xl border transition-all',
                              isInCart
                                ? 'bg-primary-light border-indigo-200'
                                : 'bg-slate-50 border-slate-100 hover:border-indigo-200',
                            ].join(' ')}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-700 line-clamp-2">
                                  {terminLabel(name, termin.title)}
                                </p>
                                <p
                                  className={[
                                    'text-sm font-bold mt-0.5',
                                    isInCart ? 'text-primary' : 'text-slate-700',
                                  ].join(' ')}
                                >
                                  {formatRupiah(termin.amount)}
                                </p>
                              </div>
                              <span
                                className={[
                                  'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                                  isInCart
                                    ? 'bg-primary text-white'
                                    : 'bg-white border border-slate-200 text-slate-500',
                                ].join(' ')}
                              >
                                {isInCart ? '✅' : <ShoppingCart size={14} />}
                              </span>
                            </div>
                          </button>
                        );
                      })
                    );

                  return (
                    <div key={group.id} className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                      <div className="flex justify-between items-start mb-4 gap-2">
                        <div className="min-w-0">
                          <span className="font-bold text-slate-700 text-lg">{name}</span>
                          {!showDonut && !isFullyPaid ? (
                            <p className="text-xs font-semibold text-slate-500 mt-0.5">
                              {formatRupiah(remaining > 0 ? remaining : group.total)}
                            </p>
                          ) : null}
                        </div>
                        <Link
                          href={groupHistoryHref(group.id)}
                          className="text-[10px] font-bold text-primary hover:bg-indigo-100 flex items-center bg-primary-light px-2.5 py-1.5 rounded-full transition-colors shrink-0"
                        >
                          {showDonut
                            ? lang === 'en'
                              ? 'Installment History'
                              : 'Riwayat Cicilan'
                            : lang === 'en'
                              ? 'History'
                              : 'Riwayat'}{' '}
                          <span className="ml-1">›</span>
                        </Link>
                      </div>

                      {showDonut ? (
                        <div className="flex items-start gap-4">
                          <div className="flex flex-col items-center shrink-0 w-1/3 border-r border-slate-100 pr-2">
                            <ProgressRing percentage={progressPercentage} />
                            <div className="mt-2 text-center w-full">
                              {isFullyPaid ? (
                                <>
                                  <p className="text-[10px] text-slate-500 leading-tight">
                                    {lang === 'en' ? 'Billed' : 'Tagihan'}
                                  </p>
                                  <p className="text-xs font-bold text-slate-700 leading-tight">
                                    {formatRupiah(group.total)}
                                  </p>
                                  <p className="text-[10px] font-bold text-emerald-600 mt-1">
                                    {lang === 'en' ? 'Paid in full' : 'Lunas'}
                                  </p>
                                </>
                              ) : (
                                <>
                                  <p className="text-[10px] text-slate-500 leading-tight">
                                    {lang === 'en' ? 'Left' : 'Sisa'}
                                  </p>
                                  <p className="text-xs font-bold text-slate-700 leading-tight">
                                    {formatRupiah(remaining)}
                                  </p>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="w-2/3 flex flex-col gap-2">{terminButtons}</div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">{terminButtons}</div>
                      )}
                    </div>
                  );
                })}

                {installmentGroups.length === 0 ? (
                  <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 text-sm text-slate-600">
                    {lang === 'en' ? 'No bills found.' : 'Tidak ada tagihan.'}
                  </div>
                ) : null}
              </div>

              <div className="hidden md:block bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                {installmentGroups.length === 0 ? (
                  <p className="text-sm text-slate-600">
                    {lang === 'en' ? 'No bills found.' : 'Tidak ada tagihan.'}
                  </p>
                ) : (
                  <div className="space-y-6">
                    {installmentGroups.map((group) => {
                      const remaining = Math.max(0, group.total - group.paid);
                      const isFullyPaid = group.isFullyPaid || (group.total > 0 && remaining === 0);
                      const progressPercentage =
                        group.total === 0 ? 0 : Math.min(100, (group.paid / group.total) * 100);
                      const name = lang === 'en' ? group.nameEn : group.nameId;
                      const showDonut = group.isInstallment;

                      return (
                        <div key={group.id} className="border-b border-slate-100 last:border-0 pb-5 last:pb-0">
                          <div className="flex items-center justify-between gap-3 mb-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="font-semibold text-slate-700">{name}</span>
                              <Link
                                href={groupHistoryHref(group.id)}
                                className="text-[10px] font-bold text-primary bg-primary-light px-2 py-0.5 rounded-full hover:bg-indigo-100 shrink-0"
                              >
                                {lang === 'en' ? 'History' : 'Riwayat'} ›
                              </Link>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              {showDonut ? (
                                <>
                                  <div className="w-24 bg-slate-100 rounded-full h-2">
                                    <div
                                      className="bg-primary h-2 rounded-full transition-all"
                                      style={{ width: `${progressPercentage}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] text-slate-500 w-8">
                                    {progressPercentage.toFixed(0)}%
                                  </span>
                                </>
                              ) : null}
                              {isFullyPaid ? (
                                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                                  {lang === 'en' ? 'Paid' : 'Lunas'}
                                </span>
                              ) : (
                                <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                                  {formatRupiah(remaining)}
                                </span>
                              )}
                            </div>
                          </div>

                          {!isFullyPaid && group.termins.length > 0 ? (
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                                  <th className="pb-2 font-semibold">
                                    {showDonut
                                      ? lang === 'en'
                                        ? 'Termin'
                                        : 'Termin'
                                      : lang === 'en'
                                        ? 'Bill'
                                        : 'Tagihan'}
                                  </th>
                                  <th className="pb-2 font-semibold text-right">
                                    {lang === 'en' ? 'Amount' : 'Jumlah'}
                                  </th>
                                  <th className="pb-2 font-semibold text-center w-20" />
                                </tr>
                              </thead>
                              <tbody>
                                {group.termins.map((termin) => {
                                  const cartId = `spp-${activeChildId}-${termin.billId}`;
                                  const isInCart = cart.some((i) => i.id === cartId);
                                  return (
                                    <tr
                                      key={termin.billId}
                                      className={[
                                        'border-b border-slate-50 last:border-0',
                                        isInCart ? 'bg-primary-light/50' : '',
                                      ].join(' ')}
                                    >
                                      <td className="py-2 font-medium text-slate-700">
                                        {terminLabel(name, termin.title)}
                                      </td>
                                      <td
                                        className={[
                                          'py-2 text-right font-bold',
                                          isInCart ? 'text-primary' : 'text-slate-700',
                                        ].join(' ')}
                                      >
                                        {formatRupiah(termin.amount)}
                                      </td>
                                      <td className="py-2 text-center">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            toggleTuitionToCart(termin.billId, termin.title, termin.amount)
                                          }
                                          className={[
                                            'w-8 h-8 rounded-full inline-flex items-center justify-center transition-all',
                                            isInCart
                                              ? 'bg-primary text-white shadow-md'
                                              : 'bg-slate-100 text-slate-500 hover:bg-indigo-100 hover:text-primary',
                                          ].join(' ')}
                                          aria-label={isInCart ? 'Remove from cart' : 'Add to cart'}
                                        >
                                          {isInCart ? '✅' : <ShoppingCart size={14} />}
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="space-y-4 md:hidden">
                {installments.map((inst) => {
                  const cartId = `inst-${inst.id}`;
                  const remaining = Math.max(0, inst.total - inst.paid);
                  const isFullyPaid = inst.isFullyPaid || (inst.total > 0 && remaining === 0);
                  const progressPercentage =
                    inst.total === 0 ? 0 : Math.min(100, (inst.paid / inst.total) * 100);
                  const instFloor = inst.minPayment > 0 ? inst.minPayment : remaining > 0 ? 1 : 0;
                  const typedAmount = installmentInputs[inst.id];
                  const defaultInput =
                    typedAmount != null && typedAmount >= instFloor ? typedAmount : instFloor;
                  const name = lang === 'en' ? inst.nameEn : inst.nameId;
                  const cartItem = !isFullyPaid ? cart.find((i) => i.id === cartId) : undefined;

                  return (
                    <div key={inst.id} className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                      <div className="flex justify-between items-start mb-5">
                        <span className="font-bold text-slate-700 text-lg">{name}</span>
                        <Link
                          href={`/finance/installments/${inst.id}/history`}
                          className="text-[10px] font-bold text-primary hover:bg-indigo-100 flex items-center bg-primary-light px-2.5 py-1.5 rounded-full transition-colors"
                        >
                          {lang === 'en' ? 'Installment History' : 'Riwayat Cicilan'}{' '}
                          <span className="ml-1">›</span>
                        </Link>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center shrink-0 w-1/3 border-r border-slate-100 pr-2">
                          <ProgressRing percentage={progressPercentage} />
                          <div className="mt-2 text-center w-full">
                            {isFullyPaid ? (
                              <>
                                <p className="text-[10px] text-slate-500 leading-tight">
                                  {lang === 'en' ? 'Billed' : 'Tagihan'}
                                </p>
                                <p className="text-xs font-bold text-slate-700 leading-tight">
                                  {formatRupiah(inst.total)}
                                </p>
                                <p className="text-[10px] font-bold text-emerald-600 mt-1">
                                  {lang === 'en' ? 'Paid in full' : 'Lunas'}
                                </p>
                              </>
                            ) : (
                              <>
                                <p className="text-[10px] text-slate-500 leading-tight">
                                  {lang === 'en' ? 'Left' : 'Sisa'}
                                </p>
                                <p className="text-xs font-bold text-slate-700 leading-tight">
                                  {formatRupiah(remaining)}
                                </p>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="w-2/3 flex flex-col justify-center">
                          {isFullyPaid ? (
                            <div className="bg-emerald-50 text-emerald-800 text-sm p-3 rounded-xl flex flex-col gap-1 font-bold">
                              <span className="flex items-center">
                                <span className="mr-2">✅</span> {lang === 'en' ? 'Fully paid' : 'Sudah lunas'}
                              </span>
                              <span className="text-[11px] font-semibold text-emerald-700/90 normal-case">
                                {lang === 'en'
                                  ? 'No further payment needed for this bill.'
                                  : 'Tidak perlu pembayaran tambahan untuk tagihan ini.'}
                              </span>
                            </div>
                          ) : cartItem ? (
                            <div className="bg-primary-light border border-indigo-200 p-3 rounded-2xl flex flex-col justify-center items-center h-full space-y-2">
                              <div className="text-center">
                                <p className="text-[10px] text-primary font-bold mb-0.5">
                                  {lang === 'en' ? 'In Cart' : 'Di Keranjang'}
                                </p>
                                <p className="font-bold text-slate-700 text-sm">{formatRupiah(cartItem.amount)}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeFromCart(cartId)}
                                className="text-[10px] font-bold text-red-500 px-4 py-1.5 bg-white border border-red-100 rounded-xl hover:bg-red-50 w-full"
                              >
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
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">
                                  Rp
                                </span>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  aria-label={
                                    lang === 'en' ? `Pay amount for ${name}` : `Nominal bayar untuk ${name}`
                                  }
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
                                type="button"
                                onClick={() => {
                                  const floor = inst.minPayment > 0 ? inst.minPayment : remaining > 0 ? 1 : 0;
                                  const typed = installmentInputs[inst.id];
                                  const input = typed != null && typed >= floor ? typed : floor;
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

              <div className="hidden md:block bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                {installments.length === 0 ? (
                  <p className="text-sm text-slate-600">
                    {lang === 'en' ? 'No installments found.' : 'Tidak ada cicilan.'}
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                          <th className="pb-2 font-semibold">{lang === 'en' ? 'Fee Name' : 'Nama Tagihan'}</th>
                          <th className="pb-2 font-semibold text-right">{lang === 'en' ? 'Total' : 'Total'}</th>
                          <th className="pb-2 font-semibold text-right">{lang === 'en' ? 'Paid' : 'Dibayar'}</th>
                          <th className="pb-2 font-semibold text-right">{lang === 'en' ? 'Remaining' : 'Sisa'}</th>
                          <th className="pb-2 font-semibold text-center">{lang === 'en' ? 'Progress' : 'Progress'}</th>
                          <th className="pb-2 font-semibold text-center">{lang === 'en' ? 'Status' : 'Status'}</th>
                          <th className="pb-2 font-semibold">{lang === 'en' ? 'Pay' : 'Bayar'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {installments.map((inst) => {
                          const cartId = `inst-${inst.id}`;
                          const remaining = Math.max(0, inst.total - inst.paid);
                          const isFullyPaid = inst.isFullyPaid || (inst.total > 0 && remaining === 0);
                          const progressPercentage =
                            inst.total === 0 ? 0 : Math.min(100, (inst.paid / inst.total) * 100);
                          const instFloor = inst.minPayment > 0 ? inst.minPayment : remaining > 0 ? 1 : 0;
                          const typedAmount = installmentInputs[inst.id];
                          const defaultInput =
                            typedAmount != null && typedAmount >= instFloor ? typedAmount : instFloor;
                          const name = lang === 'en' ? inst.nameEn : inst.nameId;
                          const cartItem = !isFullyPaid ? cart.find((i) => i.id === cartId) : undefined;

                          return (
                            <tr
                              key={inst.id}
                              className={[
                                'border-b border-slate-100 last:border-0 transition-colors',
                                cartItem ? 'bg-primary-light/50' : '',
                              ].join(' ')}
                            >
                              <td className="py-3">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-slate-700">{name}</span>
                                  <Link
                                    href={`/finance/installments/${inst.id}/history`}
                                    className="text-[10px] font-bold text-primary bg-primary-light px-2 py-0.5 rounded-full hover:bg-indigo-100 shrink-0"
                                  >
                                    {lang === 'en' ? 'History' : 'Riwayat'} ›
                                  </Link>
                                </div>
                              </td>
                              <td className="py-3 text-right font-bold text-slate-700">{formatRupiah(inst.total)}</td>
                              <td className="py-3 text-right text-slate-600">{formatRupiah(inst.paid)}</td>
                              <td className="py-3 text-right font-bold text-slate-700">{formatRupiah(remaining)}</td>
                              <td className="py-3 text-center">
                                <div className="w-full bg-slate-100 rounded-full h-2 max-w-[80px] mx-auto">
                                  <div
                                    className="bg-primary h-2 rounded-full transition-all"
                                    style={{ width: `${progressPercentage}%` }}
                                  />
                                </div>
                                <span className="text-[10px] text-slate-500">{progressPercentage.toFixed(0)}%</span>
                              </td>
                              <td className="py-3 text-center">
                                {isFullyPaid ? (
                                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                                    {lang === 'en' ? 'Paid' : 'Lunas'}
                                  </span>
                                ) : cartItem ? (
                                  <div className="flex flex-col items-center gap-1">
                                    <span className="text-xs font-bold text-primary">
                                      {formatRupiah(cartItem.amount)}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => removeFromCart(cartId)}
                                      className="text-[10px] font-bold text-red-500 hover:underline"
                                    >
                                      {lang === 'en' ? 'Remove' : 'Hapus'}
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                                    {lang === 'en' ? 'Unpaid' : 'Belum'}
                                  </span>
                                )}
                              </td>
                              <td className="py-3">
                                {!isFullyPaid && !cartItem ? (
                                  <div className="flex items-center gap-2">
                                    <div className="relative">
                                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                                        Rp
                                      </span>
                                      <input
                                        type="text"
                                        inputMode="numeric"
                                        aria-label={
                                          lang === 'en'
                                            ? `Pay amount for ${name}`
                                            : `Nominal bayar untuk ${name}`
                                        }
                                        className="w-28 pl-7 pr-2 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white text-right"
                                        value={formatInputNumber(defaultInput)}
                                        onChange={(e) => {
                                          const raw = e.target.value.replace(/\D/g, '');
                                          const next = raw ? Number(raw) : 0;
                                          setInstallmentInputs((p) => ({ ...p, [inst.id]: next }));
                                        }}
                                      />
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const floor =
                                          inst.minPayment > 0 ? inst.minPayment : remaining > 0 ? 1 : 0;
                                        const typed = installmentInputs[inst.id];
                                        const input = typed != null && typed >= floor ? typed : floor;
                                        const finalAmount = Math.min(Math.max(input, floor), remaining);
                                        addInstallmentToCart(inst.id, name, finalAmount);
                                      }}
                                      className="bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-600 transition-colors shrink-0"
                                    >
                                      {lang === 'en' ? 'Add' : '+'}
                                    </button>
                                  </div>
                                ) : null}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <FloatingCartBar />
    </div>
  );
}
