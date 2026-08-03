'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Moon,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Header } from '@/components/portal/Header';
import { ChildSelector } from '@/components/portal/ChildSelector';
import { useActiveChild, useIsModuleActive, usePortalState } from '@/components/portal/state/PortalProvider';
import { t } from '@/lib/i18n/translations';

type Tab = 'progress' | 'history' | 'rekap';

const HISTORY_PAGE_SIZE = 10;

type Summary = {
  student: {
    full_name: string;
    nis: string;
    school_name: string;
    class_name: string | null;
    grade_name: string | null;
  };
  target: {
    jilid_id: number;
    halaman: number;
    jilid_name: string;
    surah_nomor: number;
    surah_name: string;
  } | null;
  latest: {
    log_date: string;
    is_absent: boolean;
    jilid_id: number | null;
    jilid_name: string | null;
    halaman: number | null;
    surah_nomor: number | null;
    surah_name: string | null;
  } | null;
  tilawah_pct: number;
  tahfidz_pct: number;
  avg_pct: number;
  tilawah_ok: boolean;
  tahfidz_ok: boolean;
  achieved_count: number;
};

type HistoryItem = {
  log_date: string;
  is_absent: boolean;
  jilid_name: string | null;
  halaman: number | null;
  surah_nomor: number | null;
  surah_name: string | null;
  catatan: string | null;
  tilawah_pct: number;
  tahfidz_pct: number;
  tilawah_ok: boolean;
  tahfidz_ok: boolean;
  achieved_today: { nomor: number; name_latin: string; ayah_count: number }[];
};

type AchievedItem = {
  nomor: number;
  surah_name: string;
  ayah_count: number;
  achieved_date: string;
  verified_by: string | null;
};

type RekapData = Summary & {
  hadir: number;
  absen: number;
  attendance_pct: number;
  chart: { date: string; halaman: number }[];
  achieved: AchievedItem[];
};

function formatLongDate(iso: string, lang: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString(lang === 'en' ? 'en-GB' : 'id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatShortDate(iso: string, lang: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString(lang === 'en' ? 'en-GB' : 'id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function PctBar({ value, label }: { value: number; label: string }) {
  const ok = value >= 100;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-600">{label}</span>
        <span className={`font-bold ${ok ? 'text-emerald-600' : 'text-slate-700'}`}>{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${ok ? 'bg-emerald-500' : 'bg-violet-500'}`}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
    </div>
  );
}

export function TtqPageClient() {
  const { lang } = usePortalState();
  const activeChild = useActiveChild();
  const ttqEnabled = useIsModuleActive('ttq');
  const activeChildId = activeChild?.id ? Number(activeChild.id) : null;
  const [tab, setTab] = useState<Tab>('progress');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyHasMore, setHistoryHasMore] = useState(false);
  const [historyLoadingMore, setHistoryLoadingMore] = useState(false);
  const historySentinelRef = useRef<HTMLDivElement | null>(null);
  const [achieved, setAchieved] = useState<AchievedItem[]>([]);
  const [rekap, setRekap] = useState<RekapData | null>(null);
  const [rekapMode, setRekapMode] = useState<'month' | 'year'>('month');
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(false);

  const loadSummary = useCallback(async () => {
    if (!activeChildId) {
      setSummary(null);
      return;
    }
    const res = await fetch(`/api/portal/ttq/summary?studentId=${activeChildId}`);
    if (!res.ok) {
      setSummary(null);
      return;
    }
    setSummary((await res.json()) as Summary);
  }, [activeChildId]);

  const loadHistory = useCallback(async () => {
    if (!activeChildId) {
      setHistory([]);
      setHistoryHasMore(false);
      return;
    }
    const res = await fetch(
      `/api/portal/ttq/history?studentId=${activeChildId}&limit=${HISTORY_PAGE_SIZE}&offset=0`,
    );
    if (!res.ok) {
      setHistory([]);
      setHistoryHasMore(false);
      return;
    }
    const data = (await res.json()) as { items: HistoryItem[]; hasMore: boolean };
    setHistory(data.items || []);
    setHistoryHasMore(Boolean(data.hasMore));
  }, [activeChildId]);

  const loadMoreHistory = useCallback(async () => {
    if (!activeChildId || historyLoadingMore || !historyHasMore) return;
    setHistoryLoadingMore(true);
    try {
      const res = await fetch(
        `/api/portal/ttq/history?studentId=${activeChildId}&limit=${HISTORY_PAGE_SIZE}&offset=${history.length}`,
      );
      if (!res.ok) return;
      const data = (await res.json()) as { items: HistoryItem[]; hasMore: boolean };
      setHistory((prev) => [...prev, ...(data.items || [])]);
      setHistoryHasMore(Boolean(data.hasMore));
    } finally {
      setHistoryLoadingMore(false);
    }
  }, [activeChildId, historyLoadingMore, historyHasMore, history.length]);

  const loadAchieved = useCallback(async () => {
    if (!activeChildId) {
      setAchieved([]);
      return;
    }
    const res = await fetch(`/api/portal/ttq/achieved?studentId=${activeChildId}`);
    if (!res.ok) {
      setAchieved([]);
      return;
    }
    const data = await res.json();
    setAchieved(data.items || []);
  }, [activeChildId]);

  const loadRekap = useCallback(async () => {
    if (!activeChildId) {
      setRekap(null);
      return;
    }
    const params = new URLSearchParams({
      studentId: String(activeChildId),
      mode: rekapMode,
    });
    if (rekapMode === 'month') params.set('month', month);
    const res = await fetch(`/api/portal/ttq/rekap?${params}`);
    if (!res.ok) {
      setRekap(null);
      return;
    }
    setRekap((await res.json()) as RekapData);
  }, [activeChildId, rekapMode, month]);

  useEffect(() => {
    setTab('progress');
  }, [activeChildId]);

  useEffect(() => {
    if (!ttqEnabled) return;
    (async () => {
      setLoading(true);
      await Promise.all([loadSummary(), loadHistory(), loadAchieved()]);
      setLoading(false);
    })();
  }, [ttqEnabled, loadSummary, loadHistory, loadAchieved]);

  useEffect(() => {
    if (!ttqEnabled) return;
    if (tab === 'rekap') loadRekap();
  }, [ttqEnabled, tab, loadRekap]);

  useEffect(() => {
    if (tab !== 'history') return;
    const el = historySentinelRef.current;
    if (!el || !historyHasMore) return;

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMoreHistory();
      },
      { rootMargin: '160px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [tab, historyHasMore, loadMoreHistory]);

  if (!ttqEnabled) {
    return (
      <div className="min-h-screen bg-slate-50 pb-24 md:pb-8">
        <Header title="TTQ Tracker" backHref="/" />
        <div className="px-4 pt-3">
          <ChildSelector />
        </div>
        <div className="px-4 py-10 text-center text-sm text-slate-500">
          {lang === 'en'
            ? 'TTQ Tracker is not available for this school.'
            : 'TTQ Tracker tidak tersedia untuk sekolah ini.'}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24 md:pb-8">
      <Header title="TTQ Tracker" backHref="/" />

      <div className="px-4 pt-3">
        <ChildSelector />
      </div>

      {!activeChildId ? (
        <div className="px-4 py-10 text-center text-sm text-slate-500">
          {t(lang, 'habitsNoChild')}
        </div>
      ) : loading && !summary ? (
        <div className="px-4 py-10 text-center text-sm text-slate-500">
          {lang === 'en' ? 'Loading…' : 'Memuat…'}
        </div>
      ) : (
        <>
          {summary && (
            <div className="px-4 pt-4">
              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 text-lg font-bold text-violet-700">
                    {summary.student.full_name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-800">
                      {summary.student.full_name}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {[summary.student.class_name, summary.student.grade_name]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                    <p className="text-xs text-slate-400">
                      {summary.student.school_name}
                      {summary.student.nis ? ` · NIS ${summary.student.nis}` : ''}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <StatCard
                    icon={<BookOpen size={16} />}
                    label="Tilawah"
                    value={
                      summary.latest && !summary.latest.is_absent
                        ? `${summary.latest.jilid_name || '—'} Hal.${summary.latest.halaman ?? '—'}`
                        : '—'
                    }
                    sub={`${summary.tilawah_pct}%`}
                  />
                  <StatCard
                    icon={<Moon size={16} />}
                    label="Tahfidz"
                    value={
                      summary.latest && !summary.latest.is_absent
                        ? summary.latest.surah_name || '—'
                        : '—'
                    }
                    sub={`${summary.tahfidz_pct}%`}
                  />
                  <StatCard
                    icon={<CheckCircle2 size={16} />}
                    label={lang === 'en' ? 'Memorized' : 'Hafalan ✓'}
                    value={String(summary.achieved_count)}
                    sub="surah"
                  />
                  <StatCard
                    icon={<Clock size={16} />}
                    label={lang === 'en' ? 'Updated' : 'Terakhir'}
                    value={
                      summary.latest
                        ? new Date(summary.latest.log_date + 'T12:00:00').toLocaleDateString(
                            lang === 'en' ? 'en-GB' : 'id-ID',
                            { day: 'numeric', month: 'short' }
                          )
                        : '—'
                    }
                    sub=""
                  />
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 flex gap-1 overflow-x-auto px-4">
            {(
              [
                ['progress', lang === 'en' ? 'Progress' : 'Progress'],
                ['history', lang === 'en' ? 'Daily History' : 'Riwayat Harian'],
                ['rekap', lang === 'en' ? 'Recap' : 'Rekap'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition ${
                  tab === id
                    ? 'bg-violet-700 text-white'
                    : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-4 px-4 space-y-3">
            {tab === 'progress' && summary && (
              <>
                <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
                    <BookOpen size={16} className="text-violet-700" /> Tilawah
                  </h3>
                  <p className="text-sm text-slate-700">
                    {lang === 'en' ? 'Current' : 'Posisi Saat Ini'}:{' '}
                    <b>
                      {summary.latest && !summary.latest.is_absent
                        ? `${summary.latest.jilid_name} Halaman ${summary.latest.halaman}`
                        : '—'}
                    </b>
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Target: {summary.target?.jilid_name} Hal.{summary.target?.halaman}
                  </p>
                  <div className="mt-3">
                    <PctBar value={summary.tilawah_pct} label="% vs target" />
                  </div>
                  <span
                    className={`mt-3 inline-block rounded-full px-2.5 py-1 text-[11px] font-bold ${
                      summary.tilawah_ok
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {summary.tilawah_ok
                      ? lang === 'en'
                        ? '✓ Achieved'
                        : '✓ Tercapai'
                      : lang === 'en'
                        ? 'Not yet'
                        : 'Belum Tercapai'}
                  </span>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
                    <Moon size={16} className="text-violet-700" /> Tahfidz
                  </h3>
                  <p className="text-sm text-slate-700">
                    {lang === 'en' ? 'Currently memorizing' : 'Sedang Dihafal'}:{' '}
                    <b>
                      {summary.latest && !summary.latest.is_absent
                        ? `${summary.latest.surah_name} (${summary.latest.surah_nomor})`
                        : '—'}
                    </b>
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Target: {summary.target?.surah_name} ({summary.target?.surah_nomor})
                  </p>
                  <div className="mt-3">
                    <PctBar value={summary.tahfidz_pct} label="% vs target" />
                  </div>
                  {achieved.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {achieved.map((a) => (
                        <span
                          key={a.nomor}
                          className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700"
                        >
                          ✓ {a.surah_name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {tab === 'history' && (
              <>
                {!history.length && (
                  <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center text-sm text-slate-400">
                    {lang === 'en' ? 'No session history yet' : 'Belum ada riwayat sesi'}
                  </div>
                )}

                {/* Mobile: cards */}
                <div className="space-y-3 md:hidden">
                  {history.map((h) => (
                    <HistoryCard key={h.log_date} item={h} lang={lang} />
                  ))}
                </div>

                {/* Desktop: table */}
                {history.length > 0 && (
                  <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
                    <table className="w-full min-w-[720px] text-left text-sm">
                      <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-4 py-3">{lang === 'en' ? 'Date' : 'Tanggal'}</th>
                          <th className="px-4 py-3">{lang === 'en' ? 'Status' : 'Status'}</th>
                          <th className="px-4 py-3">Tilawah</th>
                          <th className="px-4 py-3">Tahfidz</th>
                          <th className="px-4 py-3">{lang === 'en' ? 'Notes' : 'Catatan'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {history.map((h) => (
                          <tr key={h.log_date} className="align-top hover:bg-slate-50/60">
                            <td className="px-4 py-3 whitespace-nowrap font-semibold text-slate-800">
                              {formatShortDate(h.log_date, lang)}
                              {h.achieved_today.length > 0 && (
                                <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-amber-700">
                                  <Sparkles size={12} />
                                  {h.achieved_today.map((a) => a.name_latin).join(', ')}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {h.is_absent ? (
                                <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-600">
                                  {lang === 'en' ? 'Absent' : 'Tidak Hadir'}
                                </span>
                              ) : (
                                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                                  {lang === 'en' ? 'Present' : 'Hadir'}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-700">
                              {h.is_absent ? (
                                '—'
                              ) : (
                                <div>
                                  <p className="font-semibold">
                                    {h.jilid_name} Hal.{h.halaman}
                                  </p>
                                  <p
                                    className={`text-[11px] font-bold ${
                                      h.tilawah_ok ? 'text-emerald-600' : 'text-amber-600'
                                    }`}
                                  >
                                    {h.tilawah_pct}% {h.tilawah_ok ? '✓' : '· Belum'}
                                  </p>
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-700">
                              {h.is_absent ? (
                                '—'
                              ) : (
                                <div>
                                  <p className="font-semibold">
                                    {h.surah_name} ({h.surah_nomor})
                                  </p>
                                  <p
                                    className={`text-[11px] font-bold ${
                                      h.tahfidz_ok ? 'text-emerald-600' : 'text-amber-600'
                                    }`}
                                  >
                                    {h.tahfidz_pct}% {h.tahfidz_ok ? '✓' : '· Belum'}
                                  </p>
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-500 max-w-[220px]">
                              {h.catatan || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {historyHasMore ? (
                  <div ref={historySentinelRef} className="h-4 w-full" aria-hidden />
                ) : null}
                {historyLoadingMore ? (
                  <p className="py-2 text-center text-sm text-slate-500">
                    {lang === 'en' ? 'Loading…' : 'Memuat…'}
                  </p>
                ) : null}
              </>
            )}

            {tab === 'rekap' && (
              <>
                <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setRekapMode('month')}
                      className={`flex-1 rounded-lg py-2 text-xs font-bold ${
                        rekapMode === 'month'
                          ? 'bg-violet-700 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {lang === 'en' ? 'Monthly' : 'Per Bulan'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRekapMode('year')}
                      className={`flex-1 rounded-lg py-2 text-xs font-bold ${
                        rekapMode === 'year'
                          ? 'bg-violet-700 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {lang === 'en' ? 'Yearly' : 'Setahun'}
                    </button>
                  </div>
                  {rekapMode === 'month' && (
                    <input
                      type="month"
                      className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      value={month}
                      onChange={(e) => setMonth(e.target.value)}
                    />
                  )}
                </div>

                {rekap ? (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
                        <p className="text-[10px] font-bold uppercase text-slate-400">
                          Target Tilawah
                        </p>
                        <p className="mt-1 text-sm font-bold text-slate-800">
                          {rekap.target?.jilid_name} Hal.{rekap.target?.halaman}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
                        <p className="text-[10px] font-bold uppercase text-slate-400">
                          Target Tahfidz
                        </p>
                        <p className="mt-1 text-sm font-bold text-slate-800">
                          {rekap.target?.surah_name} ({rekap.target?.surah_nomor})
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
                        <p className="text-[10px] font-bold uppercase text-slate-400">
                          Saat Ini Tilawah
                        </p>
                        <p className="mt-1 text-sm font-bold text-slate-800">
                          {rekap.latest && !rekap.latest.is_absent
                            ? `${rekap.latest.jilid_name} Hal.${rekap.latest.halaman}`
                            : '—'}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
                        <p className="text-[10px] font-bold uppercase text-slate-400">
                          Saat Ini Tahfidz
                        </p>
                        <p className="mt-1 text-sm font-bold text-slate-800">
                          {rekap.latest && !rekap.latest.is_absent
                            ? rekap.latest.surah_name
                            : '—'}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm space-y-3">
                      <PctBar value={rekap.tilawah_pct} label="📖 Tilawah" />
                      <PctBar value={rekap.tahfidz_pct} label="🌙 Tahfidz" />
                      <PctBar value={rekap.avg_pct} label="⭐ Rata-rata" />
                    </div>

                    {rekap.chart.length > 0 && (
                      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                        <h3 className="mb-2 flex items-center gap-1 text-sm font-bold text-slate-800">
                          <TrendingUp size={14} />{' '}
                          {lang === 'en' ? 'Tilawah progress' : 'Progres Tilawah'}
                        </h3>
                        <div className="h-48">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={rekap.chart}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                              <XAxis
                                dataKey="date"
                                tick={{ fontSize: 10 }}
                                tickFormatter={(v) => {
                                  const d = new Date(String(v) + 'T12:00:00');
                                  return `${d.getDate()}/${d.getMonth() + 1}`;
                                }}
                              />
                              <YAxis tick={{ fontSize: 10 }} />
                              <Tooltip
                                formatter={(value) => [`Halaman ${value}`, 'Tilawah']}
                              />
                              {rekap.target && (
                                <ReferenceLine
                                  y={rekap.target.halaman}
                                  stroke="#a78bfa"
                                  strokeDasharray="4 4"
                                />
                              )}
                              <Line
                                type="monotone"
                                dataKey="halaman"
                                stroke="#6d28d9"
                                strokeWidth={2}
                                dot={{ r: 3 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}

                    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                      <h3 className="mb-3 text-sm font-bold text-slate-800">
                        {lang === 'en' ? 'Completed memorization' : 'Hafalan Selesai'}
                      </h3>
                      {!rekap.achieved.length && (
                        <p className="text-xs text-slate-400">—</p>
                      )}
                      <div className="space-y-2">
                        {rekap.achieved.map((a) => (
                          <div
                            key={`${a.nomor}-${a.achieved_date}`}
                            className="flex items-start justify-between gap-2 rounded-xl bg-emerald-50 px-3 py-2"
                          >
                            <div>
                              <p className="text-sm font-bold text-emerald-800">
                                🎉 {a.surah_name} ({a.ayah_count} ayat)
                              </p>
                              <p className="text-[11px] text-emerald-700">
                                {formatLongDate(a.achieved_date, lang)}
                                {a.verified_by ? ` · ${a.verified_by}` : ''}
                              </p>
                            </div>
                            <span className="text-[10px] font-bold text-emerald-600">
                              Q.{a.nomor}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-100 bg-white p-4 text-center shadow-sm">
                      <div>
                        <div className="text-xl font-bold text-emerald-700">{rekap.hadir}</div>
                        <div className="text-xs text-slate-500">Hadir</div>
                      </div>
                      <div>
                        <div className="text-xl font-bold text-rose-600">{rekap.absen}</div>
                        <div className="text-xs text-slate-500">Tidak hadir</div>
                      </div>
                      <div>
                        <div className="text-xl font-bold text-slate-700">
                          {rekap.attendance_pct}%
                        </div>
                        <div className="text-xs text-slate-500">Tingkat</div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center text-sm text-slate-400">
                    {lang === 'en' ? 'Loading recap…' : 'Memuat rekap…'}
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-2.5">
      <div className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase text-slate-400">
        {icon}
        {label}
      </div>
      <div className="truncate text-xs font-bold text-slate-800">{value}</div>
      {sub ? <div className="text-[10px] font-semibold text-violet-700">{sub}</div> : null}
    </div>
  );
}

function HistoryCard({ item: h, lang }: { item: HistoryItem; lang: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-slate-800">{formatLongDate(h.log_date, lang)}</p>
        {h.is_absent && (
          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-600">
            {lang === 'en' ? 'Absent' : 'Tidak Hadir'}
          </span>
        )}
      </div>

      {h.achieved_today.length > 0 && (
        <div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          <div className="flex items-center gap-1 font-bold">
            <Sparkles size={14} />{' '}
            {lang === 'en' ? 'Memorization complete!' : 'Hafalan Selesai!'}
          </div>
          {h.achieved_today.map((a) => (
            <p key={a.nomor} className="mt-1 text-xs">
              {a.name_latin} (Surah {a.nomor} · {a.ayah_count} ayat)
            </p>
          ))}
        </div>
      )}

      {!h.is_absent && (
        <>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400">Tilawah</p>
              <p className="font-semibold text-slate-800">
                {h.jilid_name} Hal.{h.halaman}
              </p>
              <span
                className={`text-[11px] font-bold ${
                  h.tilawah_ok ? 'text-emerald-600' : 'text-amber-600'
                }`}
              >
                {h.tilawah_ok ? '✓' : 'Belum'}
              </span>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400">Tahfidz</p>
              <p className="font-semibold text-slate-800">
                {h.surah_name} ({h.surah_nomor})
              </p>
              <span
                className={`text-[11px] font-bold ${
                  h.tahfidz_ok ? 'text-emerald-600' : 'text-amber-600'
                }`}
              >
                {h.tahfidz_ok ? '✓' : 'Belum'}
              </span>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            <PctBar value={h.tilawah_pct} label="Tilawah" />
            <PctBar value={h.tahfidz_pct} label="Tahfidz" />
          </div>
          {h.catatan && (
            <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
              💬 {h.catatan}
            </p>
          )}
        </>
      )}
    </div>
  );
}
