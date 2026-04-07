"use client";

import Link from 'next/link';
import { usePortalState } from '@/components/portal/state/PortalProvider';
import { formatRupiah } from '@/lib/utils/format';

export function FloatingCartBar() {
  const { cart } = usePortalState();
  const total = cart.reduce((sum, i) => sum + i.amount, 0);
  if (cart.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-3 shadow-[0_-10px_20px_-5px_rgba(0,0,0,0.15)] flex justify-between items-center z-30">
      <Link href="/cart" className="cursor-pointer">
        <p className="text-xs text-slate-500 font-semibold">Total ({cart.length} items)</p>
        <p className="text-lg font-bold text-primary">{formatRupiah(total)}</p>
      </Link>
      <Link
        href="/cart"
        className="bg-primary text-white font-bold px-6 py-2.5 rounded-full hover:bg-primary-hover transition-colors flex items-center shadow-md shadow-primary/20"
      >
        Checkout <span className="ml-2">›</span>
      </Link>
    </div>
  );
}

