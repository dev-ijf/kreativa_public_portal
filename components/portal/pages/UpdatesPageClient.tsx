"use client";

import Link from 'next/link';
import { Header } from '@/components/portal/Header';
import { usePortalState } from '@/components/portal/state/PortalProvider';
import { MOCK_UPDATES } from '@/lib/data/mock/school';

export function UpdatesPageClient() {
  const { lang } = usePortalState();

  return (
    <div className="min-h-screen bg-slate-50 pb-6">
      <Header title={lang === 'en' ? 'Updates' : 'Info'} backHref="/" />
      <div className="px-4 mt-2 space-y-4">
        <h3 className="font-bold text-slate-700 mb-2">{lang === 'en' ? 'School Announcements' : 'Pengumuman Sekolah'}</h3>
        {MOCK_UPDATES.map((update) => (
          <div key={update.id} className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
            <span className="text-xs text-slate-400 mb-2 block">{update.date}</span>
            <h4 className="font-bold text-slate-700 text-lg mb-2 leading-tight">
              {lang === 'en' ? update.titleEn : update.titleId}
            </h4>
            <p className="text-slate-600 text-sm mb-4 leading-relaxed line-clamp-2">
              {lang === 'en' ? update.descEn : update.descId}
            </p>
            <Link href={`/updates/${update.id}`} className="text-primary font-bold text-sm hover:underline">
              {lang === 'en' ? 'Read More' : 'Baca Selengkapnya'}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

