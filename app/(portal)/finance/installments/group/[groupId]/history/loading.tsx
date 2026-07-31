'use client';

import { usePortalState } from '@/components/portal/state/PortalProvider';

export default function Loading() {
  const { lang } = usePortalState();
  const title = lang === 'en' ? 'Loading installment history…' : 'Memuat riwayat cicilan…';
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <p className="text-sm text-slate-600">{title}</p>
    </div>
  );
}
