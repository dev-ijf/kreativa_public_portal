"use client";

import Link from 'next/link';
import { Brain, Target } from 'lucide-react';
import { Header } from '@/components/portal/Header';
import { ChildSelector } from '@/components/portal/ChildSelector';
import { usePortalState } from '@/components/portal/state/PortalProvider';
import { MOCK_ADAPTIVE_HISTORY } from '@/lib/data/mock/adaptive';

export function AdaptiveLearningPageClient() {
  const { lang, activeChildId } = usePortalState();
  const history = MOCK_ADAPTIVE_HISTORY[activeChildId] ?? [];
  const avgScore = history.length ? Math.round(history.reduce((a, b) => a + b.score, 0) / history.length) : 0;

  const subjects = [
    { id: 'Math', nameEn: 'Math', nameId: 'Matematika', color: 'bg-blue-100 text-blue-600' },
    { id: 'Science', nameEn: 'Science', nameId: 'Ilmu Pengetahuan Alam', color: 'bg-emerald-100 text-emerald-600' },
    { id: 'English', nameEn: 'English', nameId: 'Bahasa Inggris', color: 'bg-orange-100 text-orange-600' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-6">
      <Header title={lang === 'en' ? 'Adaptive Learning' : 'Adaptive Learning'} backHref="/" />
      <ChildSelector />

      <div className="px-4 space-y-6">
        <div className="bg-primary rounded-3xl p-6 shadow-lg shadow-primary/25 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-10 -mt-10" />
          <div className="flex justify-between items-center mb-6 relative z-10">
            <h3 className="font-bold text-lg flex items-center">
              <Target size={18} className="mr-2" /> {lang === 'en' ? 'Scoreboard' : 'Scoreboard'}
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-4 relative z-10">
            <div>
              <p className="text-xs text-white/70 mb-1">{lang === 'en' ? 'Avg Score' : 'Rata-rata'}</p>
              <p className="text-3xl font-bold">{avgScore}</p>
            </div>
            <div>
              <p className="text-xs text-white/70 mb-1">{lang === 'en' ? 'Total Tests' : 'Total Tes'}</p>
              <p className="text-3xl font-bold">{history.length}</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {subjects.map((subj) => (
            <div key={subj.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
              <div className="flex items-center">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mr-4 ${subj.color}`}>
                  <Brain size={24} />
                </div>
                <span className="font-bold text-slate-700">{lang === 'en' ? subj.nameEn : subj.nameId}</span>
              </div>
              <Link href={`/adaptive-learning/test?subject=${encodeURIComponent(subj.id)}`} className="bg-primary-light text-primary px-4 py-2 rounded-full font-bold hover:bg-indigo-100">
                {lang === 'en' ? 'Start' : 'Mulai'}
              </Link>
            </div>
          ))}
        </div>

        <div>
          <h3 className="font-bold text-slate-700 mb-3 px-1">{lang === 'en' ? 'Test History' : 'Riwayat Tes'}</h3>
          <div className="space-y-3">
            {history.length === 0 ? (
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 text-center text-slate-400 text-sm">
                {lang === 'en' ? 'No history yet.' : 'Belum ada riwayat.'}
              </div>
            ) : (
              history
                .slice()
                .reverse()
                .map((test) => (
                  <Link
                    key={test.id}
                    href={`/adaptive-learning/history/${encodeURIComponent(test.id)}`}
                    className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <p className="font-bold text-slate-700 text-sm mb-1">{test.subject}</p>
                      <p className="text-[10px] text-slate-400">{test.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg text-primary">{test.score}</p>
                      <p className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-semibold mt-1">
                        {lang === 'en' ? 'Mastery' : 'Mastery'}: {(test.mastery * 100).toFixed(0)}%
                      </p>
                    </div>
                  </Link>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

