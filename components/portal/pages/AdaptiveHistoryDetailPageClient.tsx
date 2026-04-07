"use client";

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Check, X } from 'lucide-react';
import { Header } from '@/components/portal/Header';
import { usePortalState } from '@/components/portal/state/PortalProvider';
import { MOCK_ADAPTIVE_TEST_DETAILS } from '@/lib/data/mock/adaptive';

export function AdaptiveHistoryDetailPageClient() {
  const { lang } = usePortalState();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const detail = id ? MOCK_ADAPTIVE_TEST_DETAILS[id] : undefined;

  const title = useMemo(() => (lang === 'en' ? 'Adaptive Test Detail' : 'Detail tes adaptif'), [lang]);

  if (!detail) {
    return (
      <div className="min-h-screen bg-slate-50 pb-6">
        <Header title={title} backHref="/adaptive-learning" />
        <div className="px-4 mt-4">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 text-sm text-slate-600">
            {lang === 'en' ? 'Test detail not found.' : 'Detail tes tidak ditemukan.'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-6">
      <Header title={title} backHref="/adaptive-learning" />

      <div className="px-4 mt-2">
        <p className="text-xs text-slate-500">
          {detail.studentName} · {detail.subject} · {lang === 'en' ? 'Score' : 'Skor'}: {detail.score} ·{' '}
          {lang === 'en' ? 'Mastery' : 'Penguasaan'}: {detail.mastery.toFixed(2)}
        </p>
      </div>

      <div className="px-4 mt-4">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
              {lang === 'en' ? `Related Questions (${detail.questions.length})` : `Soal terkait tes (${detail.questions.length})`}
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {detail.questions.map((q, idx) => {
              return (
                <div key={q.id} className="p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-400">
                      #{idx + 1} · {q.gradeBand} · {lang === 'en' ? 'difficulty' : 'kesulitan'} {q.difficulty.toFixed(2)}
                    </p>
                  </div>

                  <p className="mt-3 text-sm text-slate-800">{q.question}</p>

                  <p className="mt-4 text-xs font-semibold tracking-wider text-slate-500 uppercase">
                    {lang === 'en' ? 'Answer choices' : 'Pilihan jawaban'}
                  </p>

                  <div className="mt-3 space-y-2">
                    {q.options.map((opt, optIdx) => {
                      const isCorrect = optIdx === q.correctIndex;
                      const isStudent = q.studentIndex === optIdx;
                      const isStudentWrong = isStudent && !isCorrect;

                      const boxClass = [
                        'w-full p-4 rounded-2xl border flex items-center justify-between',
                        isCorrect ? 'border-emerald-200 bg-emerald-50' : isStudentWrong ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white',
                      ].join(' ');

                      return (
                        <div key={optIdx} className={boxClass}>
                          <div className="flex items-center gap-3">
                            <div className="w-8 text-xs font-semibold text-slate-500">{String.fromCharCode(65 + optIdx)}.</div>
                            <div className="text-sm text-slate-700">{opt}</div>
                          </div>

                          <div className="flex items-center gap-3">
                            {isCorrect ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                                <Check size={14} /> {lang === 'en' ? 'Correct' : 'Benar'}
                              </span>
                            ) : null}
                            {isStudent ? (
                              <span
                                className={[
                                  'inline-flex items-center gap-1 text-xs font-semibold',
                                  isCorrect ? 'text-emerald-700' : 'text-red-700',
                                ].join(' ')}
                              >
                                {isCorrect ? <Check size={14} /> : <X size={14} />} {lang === 'en' ? 'Student' : 'Siswa'}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 text-xs text-slate-600">
                    <span className="text-slate-500">{lang === 'en' ? 'Student answer' : 'Jawaban siswa'}:</span>{' '}
                    <span className={q.studentIndex === q.correctIndex ? 'text-emerald-700 font-semibold' : 'text-red-700 font-semibold'}>
                      {q.studentIndex === null ? '-' : q.options[q.studentIndex]}
                    </span>{' '}
                    <span className="text-slate-500">({q.studentIndex === q.correctIndex ? (lang === 'en' ? 'correct' : 'benar') : (lang === 'en' ? 'wrong' : 'salah')})</span>
                    <span className="mx-2 text-slate-300">|</span>
                    <span className="text-slate-500">{lang === 'en' ? 'Key' : 'Kunci'}:</span>{' '}
                    <span className="text-emerald-700 font-semibold">{q.options[q.correctIndex]}</span>
                  </div>

                  <p className="mt-3 text-xs text-slate-500">{q.explanation}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

