"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Check, X, Loader2 } from 'lucide-react';
import { Header } from '@/components/portal/Header';
import { usePortalState } from '@/components/portal/state/PortalProvider';
import { LatexText } from '@/components/ui/LatexText';

type QuestionRow = {
  id: number;
  gradeBand: string;
  difficulty: number;
  questionText: string;
  optionsJson: string[];
  correctAnswer: string;
  studentAnswer: string | null;
  explanation: string | null;
  hintsJson: string[] | null;
};

type TestDetail = {
  testId: number;
  studentName: string;
  subjectNameEn: string;
  subjectNameId: string;
  score: number;
  masteryLevel: number;
  testDate: string;
};

type DetailData = {
  test: TestDetail;
  questions: QuestionRow[];
};

export function AdaptiveHistoryDetailPageClient() {
  const { lang, activeChildId } = usePortalState();
  const params = useParams<{ id: string }>();
  const sp = useSearchParams();
  const id = params?.id;
  const studentId = Number(sp.get('studentId')) || activeChildId;

  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const title = useMemo(() => (lang === 'en' ? 'Adaptive Test Detail' : 'Detail Tes Adaptif'), [lang]);

  const fetchDetail = useCallback(async () => {
    if (!id || !studentId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/portal/adaptive/history/${id}?studentId=${studentId}`);
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || 'Failed to load');
        return;
      }
      const json = await res.json() as DetailData;
      setData(json);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [id, studentId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 pb-6">
        <Header title={title} backHref="/adaptive-learning" />
        <div className="flex items-center justify-center py-24">
          <Loader2 size={24} className="animate-spin text-slate-400" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 pb-6">
        <Header title={title} backHref="/adaptive-learning" />
        <div className="px-4 mt-4">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 text-sm text-slate-600">
            {error || (lang === 'en' ? 'Test detail not found.' : 'Detail tes tidak ditemukan.')}
          </div>
        </div>
      </div>
    );
  }

  const { test, questions } = data;
  const subjectName = lang === 'en' ? test.subjectNameEn : test.subjectNameId;

  return (
    <div className="min-h-screen bg-slate-50 pb-6">
      <Header title={title} backHref="/adaptive-learning" />

      <div className="px-4 mt-2">
        <p className="text-xs text-slate-500">
          {test.studentName} · {subjectName} · {lang === 'en' ? 'Score' : 'Skor'}: {test.score} ·{' '}
          Mastery: {(test.masteryLevel * 100).toFixed(0)}%
        </p>
      </div>

      <div className="px-4 mt-4">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
              {lang === 'en' ? `Related Questions (${questions.length})` : `Soal terkait tes (${questions.length})`}
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {questions.map((q, idx) => {
              const isStudentCorrect = q.studentAnswer != null && q.studentAnswer === q.correctAnswer;

              return (
                <div key={q.id} className="p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-400">
                      #{idx + 1} · {q.gradeBand} · {lang === 'en' ? 'difficulty' : 'kesulitan'} {q.difficulty.toFixed(2)}
                    </p>
                  </div>

                  <div className="mt-3 text-sm text-slate-800">
                    <LatexText>{q.questionText}</LatexText>
                  </div>

                  <p className="mt-4 text-xs font-semibold tracking-wider text-slate-500 uppercase">
                    {lang === 'en' ? 'Answer choices' : 'Pilihan jawaban'}
                  </p>

                  <div className="mt-3 space-y-2">
                    {q.optionsJson.map((opt, optIdx) => {
                      const isCorrect = opt === q.correctAnswer;
                      const isStudent = opt === q.studentAnswer;
                      const isStudentWrong = isStudent && !isCorrect;

                      const boxClass = [
                        'w-full p-4 rounded-2xl border flex items-center justify-between',
                        isCorrect
                          ? 'border-emerald-200 bg-emerald-50'
                          : isStudentWrong
                            ? 'border-red-200 bg-red-50'
                            : 'border-slate-200 bg-white',
                      ].join(' ');

                      return (
                        <div key={optIdx} className={boxClass}>
                          <div className="flex items-center gap-3">
                            <div className="w-8 text-xs font-semibold text-slate-500 shrink-0">{String.fromCharCode(65 + optIdx)}.</div>
                            <div className="text-sm text-slate-700">
                              <LatexText>{opt}</LatexText>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            {isCorrect && (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                                <Check size={14} /> {lang === 'en' ? 'Correct' : 'Benar'}
                              </span>
                            )}
                            {isStudent && (
                              <span
                                className={[
                                  'inline-flex items-center gap-1 text-xs font-semibold',
                                  isCorrect ? 'text-emerald-700' : 'text-red-700',
                                ].join(' ')}
                              >
                                {isCorrect ? <Check size={14} /> : <X size={14} />} {lang === 'en' ? 'Student' : 'Siswa'}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 text-xs text-slate-600">
                    <span className="text-slate-500">{lang === 'en' ? 'Student answer' : 'Jawaban siswa'}:</span>{' '}
                    <span className={isStudentCorrect ? 'text-emerald-700 font-semibold' : 'text-red-700 font-semibold'}>
                      {q.studentAnswer == null ? '-' : <LatexText>{q.studentAnswer}</LatexText>}
                    </span>{' '}
                    <span className="text-slate-500">
                      ({isStudentCorrect ? (lang === 'en' ? 'correct' : 'benar') : (lang === 'en' ? 'wrong' : 'salah')})
                    </span>
                    <span className="mx-2 text-slate-300">|</span>
                    <span className="text-slate-500">{lang === 'en' ? 'Key' : 'Kunci'}:</span>{' '}
                    <span className="text-emerald-700 font-semibold">
                      <LatexText>{q.correctAnswer}</LatexText>
                    </span>
                  </div>

                  {q.explanation && (
                    <div className="mt-3 text-xs text-slate-500">
                      <LatexText>{q.explanation}</LatexText>
                    </div>
                  )}

                  {q.hintsJson && q.hintsJson.length > 0 && (
                    <div className="mt-2 space-y-0.5">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase">{lang === 'en' ? 'Hints' : 'Petunjuk'}</p>
                      {q.hintsJson.map((hint, hIdx) => (
                        <p key={hIdx} className="text-xs text-slate-400 pl-3">
                          • <LatexText>{hint}</LatexText>
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
