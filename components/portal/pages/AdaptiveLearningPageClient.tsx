"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Brain, Target, Loader2 } from 'lucide-react';
import { Header } from '@/components/portal/Header';
import { ChildSelector } from '@/components/portal/ChildSelector';
import { usePortalState } from '@/components/portal/state/PortalProvider';

type HistoryRow = {
  id: number;
  subjectId: number;
  subjectNameEn: string;
  subjectNameId: string;
  testDate: string;
  score: number;
  masteryLevel: number;
};

type SubjectRow = {
  id: number;
  code: string;
  nameEn: string;
  nameId: string;
  colorTheme: string | null;
};

type InitialDashboardResponse = {
  history: HistoryRow[];
  historyTotal: number;
  historyHasMore: boolean;
  avgScore: number;
  totalTests: number;
  subjects: SubjectRow[];
  masteryMap: Record<number, number>;
};

type TabId = 'start' | 'history';

const HISTORY_PAGE_SIZE = 5;

export function AdaptiveLearningPageClient() {
  const { lang, activeChildId } = usePortalState();
  const [activeTab, setActiveTab] = useState<TabId>('start');

  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [masteryMap, setMasteryMap] = useState<Record<number, number>>({});
  const [avgScore, setAvgScore] = useState(0);
  const [totalTests, setTotalTests] = useState(0);

  const [historyItems, setHistoryItems] = useState<HistoryRow[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const historyItemsRef = useRef<HistoryRow[]>([]);
  const historyTotalRef = useRef(0);
  const fetchingMoreRef = useRef(false);

  useEffect(() => {
    historyItemsRef.current = historyItems;
  }, [historyItems]);

  useEffect(() => {
    historyTotalRef.current = historyTotal;
  }, [historyTotal]);

  const fetchInitial = useCallback(async () => {
    if (!activeChildId) return;
    fetchingMoreRef.current = false;
    setActiveTab('start');
    setLoadingInitial(true);
    setHistoryItems([]);
    setHistoryTotal(0);
    try {
      const res = await fetch(
        `/api/portal/adaptive/history?studentId=${activeChildId}&historyLimit=${HISTORY_PAGE_SIZE}&historyOffset=0`,
      );
      if (!res.ok) return;
      const json = (await res.json()) as InitialDashboardResponse;
      setSubjects(json.subjects ?? []);
      setMasteryMap(json.masteryMap ?? {});
      setAvgScore(json.avgScore ?? 0);
      setTotalTests(json.totalTests ?? 0);
      setHistoryItems(json.history ?? []);
      setHistoryTotal(json.historyTotal ?? 0);
    } catch {
      /* best effort */
    } finally {
      setLoadingInitial(false);
    }
  }, [activeChildId]);

  useEffect(() => {
    fetchInitial();
  }, [fetchInitial]);

  const hasMoreHistory = historyItems.length < historyTotal;

  const loadMoreHistory = useCallback(async () => {
    if (!activeChildId || loadingInitial || fetchingMoreRef.current) return;
    const offset = historyItemsRef.current.length;
    if (offset >= historyTotalRef.current) return;

    fetchingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const res = await fetch(
        `/api/portal/adaptive/history?studentId=${activeChildId}&historyLimit=${HISTORY_PAGE_SIZE}&historyOffset=${offset}`,
      );
      if (!res.ok) return;
      const json = (await res.json()) as { history: HistoryRow[] };
      const next = json.history ?? [];
      if (next.length > 0) {
        setHistoryItems((prev) => {
          const seen = new Set(prev.map((h) => h.id));
          const merged = [...prev];
          for (const row of next) {
            if (!seen.has(row.id)) {
              seen.add(row.id);
              merged.push(row);
            }
          }
          return merged;
        });
      }
    } catch {
      /* ignore */
    } finally {
      fetchingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [activeChildId, loadingInitial]);

  useEffect(() => {
    if (activeTab !== 'history' || !hasMoreHistory) return;
    const el = sentinelRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const [e] = entries;
        if (e?.isIntersecting) void loadMoreHistory();
      },
      { root: null, rootMargin: '120px', threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [activeTab, hasMoreHistory, loadMoreHistory, historyItems.length]);

  const tabStartLabel = lang === 'en' ? 'Start practice' : 'Mulai latihan';
  const tabHistoryLabel = lang === 'en' ? 'Test history' : 'Riwayat tes';

  return (
    <div className="min-h-screen bg-slate-50 pb-6">
      <Header title={lang === 'en' ? 'Adaptive Learning' : 'Adaptive Learning'} backHref="/" />
      <ChildSelector />

      <div className="px-4 space-y-4">
        {/* Scoreboard */}
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
              <p className="text-3xl font-bold">{loadingInitial ? '—' : avgScore}</p>
            </div>
            <div>
              <p className="text-xs text-white/70 mb-1">{lang === 'en' ? 'Total Tests' : 'Total Tes'}</p>
              <p className="text-3xl font-bold">{loadingInitial ? '—' : totalTests}</p>
            </div>
          </div>
        </div>

        {/* Two tabs: left | right */}
        <div className="flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab('start')}
            className={[
              'flex-1 rounded-xl py-3 text-sm font-bold transition-colors',
              activeTab === 'start' ? 'bg-primary text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50',
            ].join(' ')}
          >
            {tabStartLabel}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={[
              'flex-1 rounded-xl py-3 text-sm font-bold transition-colors',
              activeTab === 'history' ? 'bg-primary text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50',
            ].join(' ')}
          >
            {tabHistoryLabel}
          </button>
        </div>

        {/* Tab: Start */}
        {activeTab === 'start' && (
          <div className="space-y-3 min-h-[200px]">
            {loadingInitial ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="animate-spin text-slate-400" />
              </div>
            ) : (
              subjects.map((subj) => {
                const mastery = masteryMap[subj.id];
                return (
                  <div
                    key={subj.id}
                    className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between"
                  >
                    <div className="flex items-center min-w-0">
                      <div
                        className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center mr-4 ${subj.colorTheme ?? 'bg-slate-100 text-slate-600'}`}
                      >
                        <Brain size={24} />
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-slate-700 block truncate">
                          {lang === 'en' ? subj.nameEn : subj.nameId}
                        </span>
                        {mastery != null && (
                          <p className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-semibold mt-0.5 inline-block">
                            Mastery: {(mastery * 100).toFixed(0)}%
                          </p>
                        )}
                      </div>
                    </div>
                    <Link
                      href={`/adaptive-learning/test?subject=${subj.id}&subjectName=${encodeURIComponent(lang === 'en' ? subj.nameEn : subj.nameId)}`}
                      className="shrink-0 bg-primary-light text-primary px-4 py-2 rounded-full font-bold hover:bg-indigo-100 ml-2"
                    >
                      {lang === 'en' ? 'Start' : 'Mulai'}
                    </Link>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Tab: History + infinite scroll */}
        {activeTab === 'history' && (
          <div className="space-y-3 min-h-[200px]">
            {loadingInitial ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="animate-spin text-slate-400" />
              </div>
            ) : historyItems.length === 0 ? (
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 text-center text-slate-400 text-sm">
                {lang === 'en' ? 'No history yet.' : 'Belum ada riwayat.'}
              </div>
            ) : (
              <>
                {historyItems.map((test) => (
                  <Link
                    key={test.id}
                    href={`/adaptive-learning/history/${test.id}?studentId=${activeChildId}`}
                    className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <p className="font-bold text-slate-700 text-sm mb-1">
                        {lang === 'en' ? test.subjectNameEn : test.subjectNameId}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(test.testDate).toLocaleDateString(lang === 'en' ? 'en-US' : 'id-ID', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg text-primary">{test.score}</p>
                      <p className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-semibold mt-1">
                        Mastery: {(test.masteryLevel * 100).toFixed(0)}%
                      </p>
                    </div>
                  </Link>
                ))}
                {hasMoreHistory ? <div ref={sentinelRef} className="h-4 w-full" aria-hidden /> : null}
                {loadingMore ? (
                  <div className="flex justify-center py-3">
                    <Loader2 size={20} className="animate-spin text-slate-400" />
                  </div>
                ) : null}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
