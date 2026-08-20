'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Apple,
  BookOpen,
  Check,
  ChevronDown,
  Dumbbell,
  Hand,
  Moon,
  Sunrise,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Header } from '@/components/portal/Header';
import { ChildSelector } from '@/components/portal/ChildSelector';
import { useActiveChild, usePortalState } from '@/components/portal/state/PortalProvider';
import {
  countTopLevelDone,
  isTopLevelHabitDone,
  type KgHabitDayResponse,
  type KgHabitMonthStat,
  type KgHabitTreeItem,
} from '@/lib/portal/kg-habits-shared';

const ICON_MAP: Record<string, LucideIcon> = {
  sunrise: Sunrise,
  hand: Hand,
  dumbbell: Dumbbell,
  apple: Apple,
  book: BookOpen,
  users: Users,
  moon: Moon,
};

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function monthLabel(year: number, month: number, lang: 'en' | 'id'): string {
  return new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'id-ID', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, 1));
}

export function KgHabitsPageClient() {
  const { lang } = usePortalState();
  const activeChild = useActiveChild();
  const [tab, setTab] = useState<'today' | 'month'>('today');
  const [date, setDate] = useState(todayISO);
  const [tree, setTree] = useState<KgHabitTreeItem[]>([]);
  const [day, setDay] = useState<KgHabitDayResponse | null>(null);
  const [items, setItems] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [monthStats, setMonthStats] = useState<KgHabitMonthStat[]>([]);
  const [daysInMonth, setDaysInMonth] = useState(31);
  const [monthYear, setMonthYear] = useState(() => {
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() + 1 };
  });

  const studentId = activeChild?.id ?? null;

  const loadDay = useCallback(async (sid: number, d: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/portal/kg-habits/day?studentId=${sid}&date=${encodeURIComponent(d)}`,
        { credentials: 'same-origin', cache: 'no-store' },
      );
      if (!res.ok) {
        setError(lang === 'en' ? 'Could not load habits.' : 'Gagal memuat kebiasaan.');
        return;
      }
      const data = (await res.json()) as { day: KgHabitDayResponse; tree: KgHabitTreeItem[] };
      setTree(data.tree);
      setDay(data.day);
      setItems(data.day.items);
      setNotes(data.day.notes ?? '');
      setDirty(false);
    } catch {
      setError(lang === 'en' ? 'Could not load habits.' : 'Gagal memuat kebiasaan.');
    } finally {
      setLoading(false);
    }
  }, [lang]);

  const loadMonth = useCallback(
    async (sid: number, year: number, month: number) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/portal/kg-habits/month?studentId=${sid}&year=${year}&month=${month}`,
          { credentials: 'same-origin', cache: 'no-store' },
        );
        if (!res.ok) {
          setError(lang === 'en' ? 'Could not load month summary.' : 'Gagal memuat rekap bulan.');
          return;
        }
        const data = (await res.json()) as {
          daysInMonth: number;
          stats: KgHabitMonthStat[];
          tree: KgHabitTreeItem[];
        };
        setTree(data.tree);
        setMonthStats(data.stats);
        setDaysInMonth(data.daysInMonth);
      } catch {
        setError(lang === 'en' ? 'Could not load month summary.' : 'Gagal memuat rekap bulan.');
      } finally {
        setLoading(false);
      }
    },
    [lang],
  );

  useEffect(() => {
    if (studentId == null) return;
    if (tab === 'today') void loadDay(studentId, date);
    else void loadMonth(studentId, monthYear.year, monthYear.month);
  }, [studentId, tab, date, monthYear, loadDay, loadMonth]);

  const doneCount = useMemo(() => countTopLevelDone(tree, items), [tree, items]);

  function toggleSimple(code: string) {
    setItems((prev) => ({ ...prev, [code]: !prev[code] }));
    setDirty(true);
  }

  function toggleSub(code: string) {
    setItems((prev) => ({ ...prev, [code]: !prev[code] }));
    setDirty(true);
  }

  async function save() {
    if (studentId == null || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/portal/kg-habits/day', {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, date, items, notes }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(
          body.error === 'Future date not allowed'
            ? lang === 'en'
              ? 'Future dates cannot be logged.'
              : 'Tanggal di masa depan tidak bisa diisi.'
            : lang === 'en'
              ? 'Could not save.'
              : 'Gagal menyimpan.',
        );
        return;
      }
      const data = (await res.json()) as { day: KgHabitDayResponse; tree: KgHabitTreeItem[] };
      setTree(data.tree);
      setDay(data.day);
      setItems(data.day.items);
      setNotes(data.day.notes ?? '');
      setDirty(false);
    } catch {
      setError(lang === 'en' ? 'Could not save.' : 'Gagal menyimpan.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <Header title={lang === 'en' ? '7 Habits' : '7 Kebiasaan'} backHref="/" />
      <ChildSelector />

      <div className="px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-2 flex gap-2">
          <button
            type="button"
            onClick={() => setTab('today')}
            className={`flex-1 py-2.5 rounded-xl font-bold text-sm ${
              tab === 'today' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {lang === 'en' ? 'Today' : 'Hari ini'}
          </button>
          <button
            type="button"
            onClick={() => setTab('month')}
            className={`flex-1 py-2.5 rounded-xl font-bold text-sm ${
              tab === 'month' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {lang === 'en' ? 'This Month' : 'Bulan ini'}
          </button>
        </div>
      </div>

      {!studentId ? (
        <p className="px-4 py-8 text-sm text-slate-500 text-center">
          {lang === 'en' ? 'Select a student to log habits.' : 'Pilih siswa untuk mencatat kebiasaan.'}
        </p>
      ) : tab === 'today' ? (
        <div className="px-4 py-5">
          <div className="flex items-center justify-between mb-3 px-1 gap-2">
            <input
              type="date"
              value={date}
              max={todayISO()}
              onChange={(e) => setDate(e.target.value)}
              className="text-sm font-semibold text-[#3B1876] bg-transparent border border-slate-200 rounded-lg px-2 py-1"
            />
            <span className="text-xs text-gray-400 shrink-0">
              {doneCount.done}/{doneCount.total}{' '}
              {lang === 'en' ? 'logged today' : 'tercatat hari ini'}
            </span>
          </div>

          <div
            className="flex items-center gap-2 rounded-xl px-3 py-2 mb-4 text-xs font-medium"
            style={{
              backgroundColor: day?.teacherConfirmed ? '#E9F8F0' : '#FEF6E4',
              color: day?.teacherConfirmed ? '#2FA870' : '#B8860B',
            }}
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: day?.teacherConfirmed ? '#2FA870' : '#E8A23D' }}
            />
            {day?.teacherConfirmed
              ? lang === 'en'
                ? 'Confirmed by teacher'
                : 'Sudah dikonfirmasi guru'
              : lang === 'en'
                ? 'Awaiting teacher confirmation at school'
                : 'Menunggu konfirmasi guru di sekolah'}
          </div>

          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
          {loading && !tree.length ? (
            <p className="text-sm text-slate-400">{lang === 'en' ? 'Loading…' : 'Memuat…'}</p>
          ) : (
            <div className="space-y-3">
              {tree.map((h) => {
                const Icon = (h.iconKey && ICON_MAP[h.iconKey]) || Check;
                const bg = h.bgColor || '#F3F1FB';
                const accent = h.accentColor || '#5B21B6';
                const name = lang === 'en' ? h.nameEn : h.nameId;
                const desc = lang === 'en' ? h.descriptionEn : h.descriptionId;
                const isExpandable = h.children.length > 0;
                const isOpen = !!expanded[h.code];

                if (!isExpandable) {
                  const done = items[h.code] === true;
                  return (
                    <button
                      key={h.code}
                      type="button"
                      onClick={() => toggleSimple(h.code)}
                      style={{ backgroundColor: bg }}
                      className="w-full flex items-center gap-3 rounded-2xl px-3.5 py-3 text-left transition active:scale-[0.99]"
                    >
                      <div
                        style={{ backgroundColor: done ? accent : '#FFFFFFB3' }}
                        className="w-11 h-11 shrink-0 rounded-xl flex items-center justify-center transition"
                      >
                        <Icon size={20} strokeWidth={2.2} color={done ? '#FFFFFF' : accent} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-800 truncate">{name}</div>
                        {desc ? <div className="text-xs text-gray-500 mt-0.5">{desc}</div> : null}
                      </div>
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: done ? accent : '#FFFFFF',
                          border: done ? 'none' : '2px solid #E5E7EB',
                        }}
                      >
                        {done && <Check size={14} strokeWidth={3} color="#FFFFFF" />}
                      </span>
                    </button>
                  );
                }

                const doneN = h.children.filter((c) => items[c.code]).length;
                const total = h.children.length;
                const allDone = isTopLevelHabitDone(h, items);

                return (
                  <div key={h.code} style={{ backgroundColor: bg }} className="rounded-2xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExpanded((p) => ({ ...p, [h.code]: !p[h.code] }))}
                      className="w-full flex items-center gap-3 px-3.5 py-3 text-left"
                    >
                      <div
                        style={{ backgroundColor: allDone ? accent : '#FFFFFFB3' }}
                        className="w-11 h-11 shrink-0 rounded-xl flex items-center justify-center transition"
                      >
                        <Icon size={20} strokeWidth={2.2} color={allDone ? '#FFFFFF' : accent} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-800 truncate">{name}</div>
                        {desc ? <div className="text-xs text-gray-500 mt-0.5">{desc}</div> : null}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className="text-xs font-bold px-2 py-1 rounded-full"
                          style={{
                            backgroundColor: allDone ? accent : '#FFFFFFB3',
                            color: allDone ? '#FFFFFF' : accent,
                          }}
                        >
                          {doneN}/{total}
                        </span>
                        <ChevronDown
                          size={16}
                          color={accent}
                          style={{
                            transform: isOpen ? 'rotate(180deg)' : 'none',
                            transition: 'transform 150ms',
                          }}
                        />
                      </div>
                    </button>
                    {isOpen && (
                      <div className="px-3.5 pb-3 pt-0.5 space-y-1.5">
                        {h.children.map((si) => {
                          const st = items[si.code] === true;
                          const label = lang === 'en' ? si.nameEn : si.nameId;
                          return (
                            <button
                              key={si.code}
                              type="button"
                              onClick={() => toggleSub(si.code)}
                              className="w-full flex items-center justify-between bg-white/70 rounded-xl px-3 py-2 text-left gap-2"
                            >
                              <span className="text-sm text-gray-700">{label}</span>
                              <span
                                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                                style={{
                                  backgroundColor: st ? accent : '#FFFFFF',
                                  border: st ? 'none' : '2px solid #E5E7EB',
                                }}
                              >
                                {st && <Check size={12} strokeWidth={3} color="#FFFFFF" />}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-[11px] text-gray-400 mt-4 px-1 leading-relaxed">
            {lang === 'en'
              ? 'Tap a habit to mark it done. Worship, Love of Learning, and Community Engagement expand into individual items. Your teacher confirms today\'s entries at school.'
              : 'Ketuk kebiasaan untuk menandai selesai. Ibadah, Cinta Belajar, dan Peduli Komunitas bisa dibuka per item. Guru mengonfirmasi catatan hari ini di sekolah.'}
          </p>

          <div className="mt-5 rounded-2xl border border-gray-100 bg-white p-4">
            <div className="text-sm font-semibold text-[#3B1876] mb-1">
              {lang === 'en' ? 'Development Notes' : 'Catatan Perkembangan'}
            </div>
            <p className="text-xs text-gray-400 mb-2">
              {lang === 'en'
                ? 'Anything worth remembering about today — a milestone, a struggle, a funny moment.'
                : 'Hal penting hari ini — pencapaian, tantangan, atau momen lucu.'}
            </p>
            <textarea
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                setDirty(true);
              }}
              placeholder={lang === 'en' ? 'Write a short note…' : 'Tulis catatan singkat…'}
              rows={2}
              className="w-full text-sm rounded-xl border border-gray-200 px-3 py-2 outline-none focus:border-[#8B5CF6] resize-none"
            />
          </div>

          <button
            type="button"
            disabled={!dirty || saving}
            onClick={() => void save()}
            className="mt-4 w-full rounded-2xl bg-[#5B21B6] text-white font-semibold py-3 disabled:opacity-40"
          >
            {saving
              ? lang === 'en'
                ? 'Saving…'
                : 'Menyimpan…'
              : lang === 'en'
                ? 'Save today'
                : 'Simpan hari ini'}
          </button>
        </div>
      ) : (
        <div className="px-4 py-5">
          <div className="flex items-baseline justify-between mb-4 px-1">
            <span className="text-sm font-semibold text-[#3B1876]">
              {monthLabel(monthYear.year, monthYear.month, lang)}
            </span>
            <span className="text-xs text-gray-400">
              {lang === 'en' ? `out of ${daysInMonth} days` : `dari ${daysInMonth} hari`}
            </span>
          </div>
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              className="text-xs px-3 py-1.5 rounded-full bg-white border border-slate-200"
              onClick={() =>
                setMonthYear((p) => {
                  const m = p.month === 1 ? 12 : p.month - 1;
                  const y = p.month === 1 ? p.year - 1 : p.year;
                  return { year: y, month: m };
                })
              }
            >
              ‹
            </button>
            <button
              type="button"
              className="text-xs px-3 py-1.5 rounded-full bg-white border border-slate-200"
              onClick={() =>
                setMonthYear((p) => {
                  const m = p.month === 12 ? 1 : p.month + 1;
                  const y = p.month === 12 ? p.year + 1 : p.year;
                  return { year: y, month: m };
                })
              }
            >
              ›
            </button>
          </div>
          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
          <div className="space-y-3">
            {tree.map((h) => {
              const stat = monthStats.find((s) => s.code === h.code);
              const count = stat?.daysDone ?? 0;
              const pct = Math.round((count / Math.max(daysInMonth, 1)) * 100);
              const Icon = (h.iconKey && ICON_MAP[h.iconKey]) || Check;
              const bg = h.bgColor || '#F3F1FB';
              const accent = h.accentColor || '#5B21B6';
              const name = lang === 'en' ? h.nameEn : h.nameId;
              return (
                <div key={h.code} style={{ backgroundColor: bg }} className="rounded-2xl px-3.5 py-3">
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      style={{ backgroundColor: accent }}
                      className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center"
                    >
                      <Icon size={16} strokeWidth={2.2} color="#FFFFFF" />
                    </div>
                    <span className="text-sm font-semibold text-gray-800 flex-1 truncate">
                      {name}
                      {h.children.length > 0 && (
                        <span className="text-[10px] font-normal text-gray-400 ml-1">
                          ({lang === 'en' ? `all ${h.children.length} items` : `semua ${h.children.length} item`})
                        </span>
                      )}
                    </span>
                    <span className="text-xs font-bold" style={{ color: accent }}>
                      {count}/{daysInMonth}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/70 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: accent }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
