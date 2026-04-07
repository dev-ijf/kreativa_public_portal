"use client";

import { useParams } from 'next/navigation';
import { Header } from '@/components/portal/Header';
import { usePortalState } from '@/components/portal/state/PortalProvider';
import { MOCK_UPDATES } from '@/lib/data/mock/school';

export function UpdateDetailPageClient() {
  const { lang } = usePortalState();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const update = MOCK_UPDATES.find((u) => u.id === id);

  if (!update) {
    return (
      <div className="min-h-screen bg-slate-50 pb-6">
        <Header title={lang === 'en' ? 'Updates' : 'Info'} backHref="/updates" />
        <div className="px-4 mt-4">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 text-sm text-slate-600">
            {lang === 'en' ? 'Update not found.' : 'Info tidak ditemukan.'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-6">
      <Header title={lang === 'en' ? 'Updates' : 'Info'} backHref="/updates" />
      <div className="px-4 mt-4">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <span className="text-xs font-semibold text-slate-400 mb-3 block">{update.date}</span>
          <h2 className="font-bold text-slate-700 text-xl mb-4 leading-tight">{lang === 'en' ? update.titleEn : update.titleId}</h2>
          <div className="text-slate-600 leading-relaxed whitespace-pre-wrap text-sm border-t border-slate-100 pt-4">
            {lang === 'en' ? update.descEn : update.descId}
          </div>
        </div>
      </div>
    </div>
  );
}

