"use client";

import { Header } from '@/components/portal/Header';
import { ChildSelector } from '@/components/portal/ChildSelector';
import { usePortalState } from '@/components/portal/state/PortalProvider';
import { FileText } from 'lucide-react';
import { MOCK_GRADES } from '@/lib/data/mock/school';

export function ReportPageClient() {
  const { lang, activeChildId } = usePortalState();
  const data = MOCK_GRADES[activeChildId];
  const total = data.subjects.reduce((s, x) => s + x.score, 0);
  const avg = data.subjects.length ? (total / data.subjects.length).toFixed(1) : '0.0';

  return (
    <div className="min-h-screen bg-slate-50 pb-6">
      <Header title={lang === 'en' ? 'Report Card' : 'Rapor'} backHref="/" />
      <ChildSelector />

      <div className="px-4">
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
            <div>
              <p className="text-xs text-slate-500">{lang === 'en' ? 'Semester' : 'Semester'}</p>
              <p className="font-bold text-slate-700">{data.semester}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">{lang === 'en' ? 'Average' : 'Rata-rata'}</p>
              <p className="font-bold text-2xl text-primary">{avg}</p>
            </div>
          </div>

          <h4 className="font-bold text-slate-700 mb-3">{lang === 'en' ? 'Grades' : 'Nilai'}</h4>
          <div className="space-y-3">
            {data.subjects.map((subj, i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center">
                  <FileText size={16} className="text-slate-400 mr-3" />
                  <span className="font-bold text-slate-600 text-sm">{subj.name}</span>
                </div>
                <span
                  className={[
                    'font-bold text-lg',
                    subj.score >= 90 ? 'text-green-600' : subj.score >= 80 ? 'text-primary' : 'text-orange-500',
                  ].join(' ')}
                >
                  {subj.score}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

