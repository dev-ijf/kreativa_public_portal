"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { Header } from '@/components/portal/Header';
import { usePortalState } from '@/components/portal/state/PortalProvider';
import { RichText } from '@/components/ui/RichText';

type BankQuestion = {
  id: number;
  subjectId: number;
  gradeBand: string;
  difficulty: number;
  questionText: string;
  optionsJson: string[];
  correctAnswer: string;
  explanation: string | null;
  hintsJson: string[] | null;
  subTopic: string | null;
  bloomsTaxonomy: string | null;
};

type SessionResult = {
  finalScore: number;
  finalMastery: number;
  totalQuestions: number;
  correctCount: number;
};

export function AdaptiveTestPageClient() {
  const { lang, activeChildId } = usePortalState();
  const router = useRouter();
  const sp = useSearchParams();
  const subjectId = Number(sp.get('subject')) || 0;
  const subjectName = sp.get('subjectName') || '';

  const [testId, setTestId] = useState<number | null>(null);
  const [question, setQuestion] = useState<BankQuestion | null>(null);
  const [nextQuestion, setNextQuestion] = useState<BankQuestion | null>(null);
  const [questionCount, setQuestionCount] = useState(10);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [currentMastery, setCurrentMastery] = useState(0.5);

  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<'correct' | 'incorrect' | null>(null);
  const [correctAnswer, setCorrectAnswer] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startedRef = useRef(false);

  const title = useMemo(
    () => (lang === 'en' ? `Test - ${subjectName}` : `Tes - ${subjectName}`),
    [lang, subjectName],
  );

  const startSession = useCallback(async () => {
    if (!activeChildId || !subjectId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/portal/adaptive/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: activeChildId, subjectId }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string; code?: string };
        if (err.code === 'NO_QUESTIONS') {
          return;
        }
        setError(err.error || 'Failed to start session');
        return;
      }
      const data = await res.json();
      setTestId(data.testId);
      setQuestion(data.question);
      setQuestionCount(data.questionCount);
      setCurrentMastery(data.currentMastery);
      setAnsweredCount(0);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [activeChildId, subjectId]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    startSession();
  }, [startSession]);

  const handleSubmit = useCallback(async () => {
    if (!testId || !question || selected == null) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/portal/adaptive/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: activeChildId,
          testId,
          bankQuestionId: question.id,
          studentAnswer: selected,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || 'Submit failed');
        return;
      }
      const data = await res.json();
      setResult(data.isCorrect ? 'correct' : 'incorrect');
      setCorrectAnswer(data.correctAnswer);
      setCurrentMastery(data.updatedMastery);
      setAnsweredCount(data.answeredCount);
      setNextQuestion(data.nextQuestion ?? null);
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  }, [testId, question, selected, activeChildId]);

  const handleNext = useCallback(() => {
    if (nextQuestion) {
      setQuestion(nextQuestion);
      setNextQuestion(null);
      setSelected(null);
      setResult(null);
      setCorrectAnswer(null);
    }
  }, [nextQuestion]);

  const handleEnd = useCallback(async () => {
    if (!testId) return;
    setEnding(true);
    try {
      const res = await fetch('/api/portal/adaptive/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: activeChildId, testId }),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || 'End session failed');
        return;
      }
      const data = await res.json() as SessionResult;
      setSessionResult(data);
    } catch {
      setError('Network error');
    } finally {
      setEnding(false);
    }
  }, [testId, activeChildId]);

  const isFinished = answeredCount >= questionCount;

  // ── Result screen ──
  if (sessionResult) {
    return (
      <div className="min-h-screen bg-slate-50 pb-6">
        <Header title={title} backHref="/adaptive-learning" />
        <div className="px-4 mt-4">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 text-center">
            <div className="text-4xl mb-2">🎉</div>
            <h2 className="font-bold text-xl text-slate-800 mb-4">
              {lang === 'en' ? 'Session Complete!' : 'Sesi Selesai!'}
            </h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-primary/5 rounded-2xl p-4">
                <p className="text-xs text-slate-500 mb-1">{lang === 'en' ? 'Score' : 'Skor'}</p>
                <p className="text-3xl font-bold text-primary">{sessionResult.finalScore}</p>
              </div>
              <div className="bg-emerald-50 rounded-2xl p-4">
                <p className="text-xs text-slate-500 mb-1">Mastery</p>
                <p className="text-3xl font-bold text-emerald-600">{(sessionResult.finalMastery * 100).toFixed(0)}%</p>
              </div>
            </div>
            <p className="text-sm text-slate-500 mb-6">
              {sessionResult.correctCount}/{sessionResult.totalQuestions}{' '}
              {lang === 'en' ? 'correct answers' : 'jawaban benar'}
            </p>
            <button
              onClick={() => router.push('/adaptive-learning')}
              className="w-full bg-primary text-white font-bold px-6 py-3 rounded-full hover:bg-primary-hover transition-colors"
            >
              {lang === 'en' ? 'Back to Dashboard' : 'Kembali ke Dashboard'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 pb-6">
        <Header title={title} backHref="/adaptive-learning" />
        <div className="flex items-center justify-center py-24">
          <Loader2 size={32} className="animate-spin text-primary" />
          <span className="ml-3 text-slate-500 font-medium">
            {lang === 'en' ? 'Preparing questions...' : 'Menyiapkan soal...'}
          </span>
        </div>
      </div>
    );
  }

  // ── Error (no question loaded) ──
  if (error && !question) {
    return (
      <div className="min-h-screen bg-slate-50 pb-6">
        <Header title={title} backHref="/adaptive-learning" />
        <div className="px-4 mt-4">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-red-100 text-sm text-red-600">
            {error}
          </div>
        </div>
      </div>
    );
  }

  // ── No questions for this level ──
  if (!question) {
    return (
      <div className="min-h-screen bg-slate-50 pb-6">
        <Header title={title} backHref="/adaptive-learning" />
        <div className="px-4 mt-4">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 text-sm text-slate-600">
            {lang === 'en' ? 'No questions available for your level.' : 'Soal tidak tersedia untuk levelmu.'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-6">
      <Header title={title} backHref="/adaptive-learning" />

      <div className="px-4 mt-4 space-y-4">
        {/* Progress bar + mastery */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-500 font-semibold">
              {lang === 'en' ? 'Question' : 'Soal'} {answeredCount + 1} / {questionCount}
            </p>
            <p className="text-xs text-emerald-600 font-semibold">
              Mastery: {(currentMastery * 100).toFixed(0)}%
            </p>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div
              className="bg-primary rounded-full h-2 transition-all duration-500"
              style={{ width: `${(answeredCount / questionCount) * 100}%` }}
            />
          </div>
        </div>

        {/* Question card */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          {question.subTopic && (
            <p className="text-[10px] text-slate-400 font-medium mb-1 uppercase tracking-wider">
              {question.subTopic}
            </p>
          )}
          <h2 className="text-slate-800 text-base leading-relaxed">
            <RichText>{question.questionText}</RichText>
          </h2>

          {/* Options */}
          <div className="mt-4 space-y-2">
            {question.optionsJson.map((opt, i) => {
              const isActive = selected === opt;
              const isCorrectOpt = result && opt === correctAnswer;
              const isWrong = result && isActive && opt !== correctAnswer;
              return (
                <button
                  key={i}
                  disabled={!!result}
                  onClick={() => setSelected(opt)}
                  className={[
                    'w-full p-4 rounded-2xl border text-left transition-all font-semibold',
                    isCorrectOpt
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                      : isWrong
                        ? 'border-red-300 bg-red-50 text-red-800'
                        : isActive
                          ? 'border-primary bg-primary-light text-slate-800'
                          : 'border-slate-200 bg-white hover:bg-slate-50',
                  ].join(' ')}
                >
                  <RichText>{opt}</RichText>
                </button>
              );
            })}
          </div>

          {/* Feedback */}
          {result && (
            <div className={[
              'mt-4 p-4 rounded-2xl border',
              result === 'correct' ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50',
            ].join(' ')}>
              <p className={['font-bold flex items-center gap-2', result === 'correct' ? 'text-emerald-700' : 'text-red-700'].join(' ')}>
                {result === 'correct' ? (
                  <>
                    <TrendingUp size={16} />
                    {lang === 'en' ? 'Correct!' : 'Benar!'}
                  </>
                ) : (
                  <>
                    <TrendingDown size={16} />
                    {lang === 'en' ? 'Incorrect!' : 'Salah!'}
                  </>
                )}
              </p>
              {question.explanation && (
                <div className="text-sm text-slate-600 mt-2">
                  <span className="font-semibold">{lang === 'en' ? 'Explanation' : 'Penjelasan'}: </span>
                  <RichText>{question.explanation}</RichText>
                </div>
              )}
              {result === 'incorrect' && question.hintsJson && question.hintsJson.length > 0 && (
                <div className="mt-3 space-y-1">
                  <p className="text-xs font-semibold text-slate-500">{lang === 'en' ? 'Hints' : 'Petunjuk'}:</p>
                  {question.hintsJson.map((hint, idx) => (
                    <p key={idx} className="text-xs text-slate-500 pl-3">
                      • <RichText>{hint}</RichText>
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-5 flex gap-3">
            {!result ? (
              <button
                onClick={handleSubmit}
                className={[
                  'flex-1 inline-flex items-center justify-center font-bold px-6 py-3 rounded-full transition-colors',
                  selected === null
                    ? 'bg-slate-200 text-slate-500'
                    : 'bg-primary text-white hover:bg-primary-hover',
                ].join(' ')}
                disabled={selected === null || submitting}
              >
                {submitting ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  lang === 'en' ? 'Submit Answer' : 'Submit Jawaban'
                )}
              </button>
            ) : isFinished || !nextQuestion ? (
              <button
                onClick={handleEnd}
                disabled={ending}
                className="flex-1 inline-flex items-center justify-center bg-primary text-white font-bold px-6 py-3 rounded-full hover:bg-primary-hover transition-colors"
              >
                {ending ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  lang === 'en' ? 'Finish Test' : 'Selesai'
                )}
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="flex-1 inline-flex items-center justify-center bg-primary text-white font-bold px-6 py-3 rounded-full hover:bg-primary-hover transition-colors"
              >
                {result === 'correct'
                  ? (lang === 'en' ? 'Next (Harder)' : 'Lanjut (Soal lebih sulit)')
                  : (lang === 'en' ? 'Next (Easier)' : 'Lanjut (Soal lebih mudah)')
                }
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
