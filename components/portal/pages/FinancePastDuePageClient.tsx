"use client";

import Link from 'next/link';
import { AlertCircle, ShoppingCart } from 'lucide-react';
import { Header } from '@/components/portal/Header';
import { FloatingCartBar } from '@/components/portal/FloatingCartBar';
import { ChildSelector } from '@/components/portal/ChildSelector';
import { usePortalState, useActiveChild } from '@/components/portal/state/PortalProvider';
import { emptyFinanceChildPayload, type FinanceChildPayload } from '@/lib/data/portal-finance-payload';
import { formatRupiah } from '@/lib/utils/format';

type FinancePastDuePageClientProps = {
  financeByChildId?: Record<number, FinanceChildPayload>;
};

export function FinancePastDuePageClient({ financeByChildId = {} }: FinancePastDuePageClientProps) {
  const { lang, activeChildId, cart, setCart } = usePortalState();
  const activeChild = useActiveChild();
  const childName = activeChild?.fullName ?? '';
  const finance = financeByChildId[activeChildId] ?? emptyFinanceChildPayload();
  const prevBills = finance.previous;

  const togglePrevBillToCart = (billId: string, title: string, amount: number) => {
    const id = `prev-${activeChildId}-${billId}`;
    setCart((prev) =>
      prev.some((i) => i.id === id) ? prev.filter((i) => i.id !== id) : [...prev, { id, childId: activeChildId, childName, type: 'previous', title, amount }],
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <Header
        title={lang === 'en' ? 'Past due (previous AY)' : 'Tunggakan (AY lalu)'}
        backHref="/finance"
        rightSlot={
          <Link href="/cart" className="relative p-2 rounded-full hover:bg-slate-100 text-slate-700" aria-label="Cart">
            <ShoppingCart size={20} />
            {cart.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center px-1">
                {cart.length}
              </span>
            )}
          </Link>
        }
      />
      <ChildSelector />

      <div className="px-4 mt-4">
        <div className="bg-red-50 rounded-3xl p-5 shadow-sm border border-red-100">
          <div className="flex items-center mb-4">
            <AlertCircle size={18} className="text-red-500 mr-2" />
            <h2 className="font-bold text-red-700 text-lg">
              {lang === 'en' ? 'Past Due (Previous AY)' : 'Tunggakan (Tahun Ajaran Lalu)'}
            </h2>
          </div>
          {prevBills.length === 0 ? (
            <p className="text-sm text-slate-600">{lang === 'en' ? 'No past due bills.' : 'Tidak ada tunggakan.'}</p>
          ) : (
            <div className="space-y-3">
              {prevBills.map((bill) => {
                const id = `prev-${activeChildId}-${bill.id}`;
                const isInCart = cart.some((i) => i.id === id);
                const title = lang === 'en' ? bill.titleEn : bill.titleId;
                return (
                  <div
                    key={bill.id}
                    className={['p-4 rounded-2xl flex items-center justify-between border transition-all', isInCart ? 'bg-primary-light border-indigo-200' : 'bg-white border-red-100'].join(' ')}
                  >
                    <div>
                      <p className="font-bold text-slate-700 text-sm mb-0.5">{title}</p>
                      <p className="text-xs text-slate-500">AY {bill.ay}</p>
                    </div>
                    <div className="flex items-center space-x-3 text-right">
                      <p className={['font-bold text-sm', isInCart ? 'text-primary' : 'text-slate-700'].join(' ')}>{formatRupiah(bill.amount)}</p>
                      <button
                        type="button"
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
          )}
        </div>

        <Link href="/finance" className="block text-center text-sm font-semibold text-primary mt-6 py-2">
          {lang === 'en' ? 'Back to tuition' : 'Kembali ke keuangan'}
        </Link>
      </div>

      <FloatingCartBar />
    </div>
  );
}
