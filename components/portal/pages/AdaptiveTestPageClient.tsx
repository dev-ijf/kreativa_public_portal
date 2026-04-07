"use client";

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/components/portal/Header';
import { usePortalState } from '@/components/portal/state/PortalProvider';
import { MOCK_ADAPTIVE_QUESTIONS } from '@/lib/data/mock/adaptive';

export function AdaptiveTestPageClient() {
  const { lang } = usePortalState();
  const sp = useSearchParams();
  const subject = sp.get('subject') || 'Math';
  const questions = MOCK_ADAPTIVE_QUESTIONS[subject] ?? [];

  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<'correct' | 'incorrect' | null>(null);

  const q = questions[idx];
  const isLast = idx >= questions.length - 1;

  const title = useMemo(() => (lang === 'en' ? `Test - ${subject}` : `Tes - ${subject}`), [lang, subject]);

  if (!q) {
    return (
      <div className="min-h-screen bg-slate-50 pb-6">
        <Header title={title} backHref="/adaptive-learning" />
        <div className="px-4 mt-4">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 text-sm text-slate-600">
            {lang === 'en' ? 'No questions available.' : 'Soal tidak tersedia.'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-6">
      <Header title={title} backHref="/adaptive-learning" />

      <div className="px-4 mt-4 space-y-4">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <p className="text-xs text-slate-500 font-semibold mb-2">
            {lang === 'en' ? 'Question' : 'Soal'} {idx + 1} / {questions.length}
          </p>
          <h2 className="font-bold text-slate-800 text-lg leading-snug">{q.question}</h2>

          <div className="mt-4 space-y-2">
            {q.options.map((opt, i) => {
              const isActive = selected === i;
              const isCorrect = result && i === q.correctIndex;
              const isWrong = result && isActive && i !== q.correctIndex;
              return (
                <button
                  key={i}
                  disabled={!!result}
                  onClick={() => setSelected(i)}
                  className={[
                    'w-full p-4 rounded-2xl border text-left transition-all font-semibold',
                    isCorrect ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : isWrong ? 'border-red-300 bg-red-50 text-red-800' : isActive ? 'border-primary bg-primary-light text-slate-800' : 'border-slate-200 bg-white hover:bg-slate-50',
                  ].join(' ')}
                >
                  {opt}
                </button>
              );
            })}
          </div>

          {result ? (
            <div className="mt-4 p-4 rounded-2xl border border-slate-100 bg-slate-50">
              <p className={['font-bold', result === 'correct' ? 'text-emerald-700' : 'text-red-700'].join(' ')}>
                {result === 'correct' ? (lang === 'en' ? 'Correct!' : 'Benar!') : (lang === 'en' ? 'Incorrect!' : 'Salah!')}
              </p>
              <p className="text-sm text-slate-600 mt-1">
                <span className="font-semibold">{lang === 'en' ? 'Explanation' : 'Penjelasan'}: </span>
                {q.explanation}
              </p>
            </div>
          ) : null}

          <div className="mt-5 flex gap-3">
            {!result ? (
              <button
                onClick={() => {
                  if (selected === null) return;
                  setResult(selected === q.correctIndex ? 'correct' : 'incorrect');
                }}
                className={[
                  'flex-1 inline-flex items-center justify-center font-bold px-6 py-3 rounded-full transition-colors',
                  selected === null ? 'bg-slate-200 text-slate-500' : 'bg-primary text-white hover:bg-primary-hover',
                ].join(' ')}
                disabled={selected === null}
              >
                {lang === 'en' ? 'Submit Answer' : 'Submit Jawaban'}
              </button>
            ) : isLast ? (
              <Link href="/adaptive-learning" className="flex-1 inline-flex items-center justify-center bg-primary text-white font-bold px-6 py-3 rounded-full hover:bg-primary-hover">
                {lang === 'en' ? 'Finish Test' : 'Selesai'}
              </Link>
            ) : (
              <button
                onClick={() => {
                  setIdx((p) => p + 1);
                  setSelected(null);
                  setResult(null);
                }}
                className="flex-1 inline-flex items-center justify-center bg-primary text-white font-bold px-6 py-3 rounded-full hover:bg-primary-hover"
              >
                {lang === 'en' ? 'Next Question' : 'Soal Berikutnya'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

