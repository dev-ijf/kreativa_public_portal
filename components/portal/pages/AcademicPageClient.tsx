"use client";

import { Header } from '@/components/portal/Header';
import { ChildSelector } from '@/components/portal/ChildSelector';
import { usePortalState } from '@/components/portal/state/PortalProvider';
import { BookOpen, Coffee } from 'lucide-react';
import { MOCK_SCHEDULE } from '@/lib/data/mock/school';

export function AcademicPageClient() {
  const { lang, activeChildId } = usePortalState();
  const items = MOCK_SCHEDULE[activeChildId] ?? [];

  return (
    <div className="min-h-screen bg-slate-50 pb-6">
      <Header title={lang === 'en' ? 'Academic' : 'Akademik'} backHref="/" />
      <ChildSelector />

      <div className="px-4">
        <h3 className="font-bold text-slate-700 mb-3">{lang === 'en' ? "Today's Schedule" : 'Jadwal Hari Ini'}</h3>
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-4">
          {items.map((item, idx) => (
            <div key={idx} className="flex relative pl-6">
              <div className="absolute left-0 top-1 w-2.5 h-2.5 rounded-full bg-primary border-2 border-primary-light" />
              {idx !== items.length - 1 ? <div className="absolute left-[4px] top-3 bottom-[-16px] w-[2px] bg-indigo-100" /> : null}
              <div className="flex-1">
                <p className="text-xs text-primary font-bold mb-0.5">{item.time}</p>
                <div className="bg-primary-light rounded-xl p-3 border border-indigo-100 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-slate-700 text-sm">{item.subject}</p>
                    <p className="text-xs text-slate-500">{lang === 'en' ? 'Teacher' : 'Guru'}: {item.teacher}</p>
                  </div>
                  {item.subject !== 'Break' ? (
                    <BookOpen size={18} className="text-indigo-300" />
                  ) : (
                    <Coffee size={18} className="text-slate-300" />
                  )}
                </div>
              </div>
            </div>
          ))}

          {items.length === 0 ? <div className="text-sm text-slate-500">{lang === 'en' ? 'No schedule.' : 'Tidak ada jadwal.'}</div> : null}
        </div>
      </div>
    </div>
  );
}

