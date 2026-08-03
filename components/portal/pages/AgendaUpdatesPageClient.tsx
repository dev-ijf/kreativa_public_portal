"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { Header } from '@/components/portal/Header';
import { ChildSelector } from '@/components/portal/ChildSelector';
import { usePortalState, useActiveChild } from '@/components/portal/state/PortalProvider';
import type { PortalAgendaRow } from '@/lib/data/server/agendas';
import type { AnnouncementPageCursor, PortalAnnouncementRow } from '@/lib/data/server/announcements';
import { agendaForChild } from '@/lib/portal/agenda-filter';

function stripTagsForExcerpt(html: string, maxLen: number): string {
  const plain = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (plain.length <= maxLen) return plain;
  return `${plain.slice(0, maxLen).trim()}…`;
}

type Tab = 'agenda' | 'updates';

type Props = {
  initialAgendas: PortalAgendaRow[];
  initialRows: PortalAnnouncementRow[];
  initialNextCursor: AnnouncementPageCursor | null;
  initialTab?: Tab;
};

export function AgendaUpdatesPageClient({
  initialAgendas,
  initialRows,
  initialNextCursor,
  initialTab = 'updates',
}: Props) {
  const router = useRouter();
  const { lang } = usePortalState();
  const activeChild = useActiveChild();
  const [tab, setTab] = useState<Tab>(initialTab);

  const switchTab = (next: Tab) => {
    setTab(next);
    router.replace(next === 'agenda' ? '/updates?tab=agenda' : '/updates', { scroll: false });
  };

  // —— Agenda state ——
  const [currentMonth, setCurrentMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const currentMonthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;

  const childAgenda = useMemo(() => {
    if (!activeChild) return [];
    return agendaForChild(initialAgendas, activeChild.schoolId, activeChild.levelGradeName);
  }, [initialAgendas, activeChild]);

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const displayedEvents = useMemo(() => {
    return selectedDateStr
      ? childAgenda.filter((ev) => ev.eventDate === selectedDateStr)
      : childAgenda.filter((ev) => ev.eventDate.startsWith(currentMonthPrefix));
  }, [childAgenda, currentMonthPrefix, selectedDateStr]);

  const monthTitle = currentMonth.toLocaleString(lang === 'en' ? 'en-US' : 'id-ID', {
    month: 'long',
    year: 'numeric',
  });

  const listTitle = selectedDateStr
    ? selectedDateStr
    : lang === 'en'
      ? 'Events This Month'
      : 'Agenda Bulan Ini';

  const countLabel =
    lang === 'en'
      ? displayedEvents.length === 1
        ? '1 event'
        : `${displayedEvents.length} events`
      : displayedEvents.length === 1
        ? '1 agenda'
        : `${displayedEvents.length} agenda`;

  // —— Updates state ——
  const [items, setItems] = useState<PortalAnnouncementRow[]>(initialRows);
  const [nextCursor, setNextCursor] = useState<AnnouncementPageCursor | null>(initialNextCursor);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loading) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        cursorPublishDate: nextCursor.publishDate,
        cursorId: nextCursor.id,
      });
      const res = await fetch(`/api/portal/announcements?${params.toString()}`);
      if (!res.ok) return;
      const data = (await res.json()) as {
        rows: PortalAnnouncementRow[];
        nextCursor: AnnouncementPageCursor | null;
      };
      setItems((prev) => [...prev, ...data.rows]);
      setNextCursor(data.nextCursor);
    } finally {
      setLoading(false);
    }
  }, [nextCursor, loading]);

  useEffect(() => {
    if (tab !== 'updates') return;
    const el = sentinelRef.current;
    if (!el || !nextCursor) return;

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: '120px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [tab, nextCursor, loadMore]);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const pageTitle = lang === 'en' ? 'Updates' : 'Info';

  return (
    <div className="min-h-screen bg-slate-50 pb-6">
      <Header title={pageTitle} backHref="/" />

      <div className="px-4 pt-2">
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
          {(
            [
              ['agenda', lang === 'en' ? 'Agenda' : 'Agenda'],
              ['updates', lang === 'en' ? 'Updates' : 'Info'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => switchTab(id)}
              className={[
                'flex-1 rounded-lg py-2.5 text-sm font-bold transition-colors',
                tab === id ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'agenda' ? (
        <>
          <ChildSelector />
          <div className="px-4 space-y-6 md:grid md:grid-cols-2 md:gap-6 md:space-y-0 md:items-start">
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentMonth(new Date(year, month - 1, 1));
                    setSelectedDateStr(null);
                  }}
                  className="p-1.5 rounded-full hover:bg-slate-100 text-slate-600"
                  aria-label={lang === 'en' ? 'Previous month' : 'Bulan sebelumnya'}
                >
                  <ChevronLeft size={22} strokeWidth={2} />
                </button>
                <div className="relative">
                  <input
                    type="month"
                    value={currentMonthPrefix}
                    onChange={(e) => {
                      if (!e.target.value) return;
                      const [y, m] = e.target.value.split('-');
                      setCurrentMonth(new Date(Number(y), Number(m) - 1, 1));
                      setSelectedDateStr(null);
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    aria-label={lang === 'en' ? 'Pick month' : 'Pilih bulan'}
                  />
                  <h3 className="font-bold text-slate-700 text-lg flex items-center justify-center">
                    {monthTitle}
                    <span className="ml-1 text-slate-400">▾</span>
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentMonth(new Date(year, month + 1, 1));
                    setSelectedDateStr(null);
                  }}
                  className="p-1.5 rounded-full hover:bg-slate-100 text-slate-600"
                  aria-label={lang === 'en' ? 'Next month' : 'Bulan berikutnya'}
                >
                  <ChevronRight size={22} strokeWidth={2} />
                </button>
              </div>

              <div className="grid grid-cols-7 mb-2">
                {weekDays.map((d) => (
                  <div key={d} className="text-center text-xs font-bold text-slate-400 py-2">
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="p-2" />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${currentMonthPrefix}-${String(day).padStart(2, '0')}`;
                  const hasEvent = childAgenda.some((ev) => ev.eventDate === dateStr);
                  const isSelected = selectedDateStr === dateStr;
                  const withDataStyle =
                    'bg-primary text-white rounded-2xl shadow-[0_4px_14px_-2px_rgba(58,46,174,0.45)] hover:brightness-105 active:brightness-95';
                  const plainStyle = 'text-slate-700 bg-transparent hover:bg-slate-100/80 rounded-2xl';
                  const selectedNoDataStyle =
                    'text-primary ring-2 ring-primary/35 ring-offset-1 ring-offset-white bg-white rounded-2xl shadow-sm';
                  return (
                    <button
                      key={dateStr}
                      type="button"
                      onClick={() => setSelectedDateStr(isSelected ? null : dateStr)}
                      className={[
                        'relative mx-auto w-10 h-10 max-w-full flex items-center justify-center text-sm font-bold transition-all',
                        hasEvent ? withDataStyle : isSelected ? selectedNoDataStyle : plainStyle,
                      ].join(' ')}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex items-baseline justify-between gap-2 mb-3 px-1">
                <h3 className="font-bold text-slate-700">{listTitle}</h3>
                <span className="text-xs text-slate-400 shrink-0">{countLabel}</span>
              </div>
              <div className="space-y-3">
                {!activeChild ? (
                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 text-center text-slate-400 text-sm">
                    {lang === 'en' ? 'No student profile available.' : 'Tidak ada profil siswa.'}
                  </div>
                ) : displayedEvents.length === 0 ? (
                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 text-center text-slate-400 text-sm">
                    {lang === 'en' ? 'No events scheduled.' : 'Tidak ada agenda.'}
                  </div>
                ) : (
                  displayedEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-start gap-3"
                    >
                      <div className="bg-violet-100 rounded-xl p-2 text-violet-700 shrink-0">
                        <CalendarDays size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 text-sm mb-1">
                          {lang === 'en' ? ev.titleEn : ev.titleId}
                        </p>
                        <p className="text-xs text-slate-500 flex items-center gap-1.5 mb-2">
                          <Clock size={12} className="shrink-0" />
                          {ev.timeRange ?? (lang === 'en' ? 'Time TBA' : 'Waktu menyusul')}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 gap-y-1.5">
                          <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
                            {!selectedDateStr ? (
                              <span className="text-[10px] font-semibold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full">
                                {ev.eventDate}
                              </span>
                            ) : null}
                            <span className="text-[10px] font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full">
                              {ev.eventType}
                            </span>
                            <span className="text-[10px] font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full">
                              {ev.targetGrade ?? (lang === 'en' ? 'All grades' : 'Semua kelas')}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap ml-auto">
                            {ev.schoolName}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="px-4 mt-4 space-y-4">
          <h3 className="font-bold text-slate-700 mb-2">
            {lang === 'en' ? 'School Announcements' : 'Pengumuman Sekolah'}
          </h3>
          {items.length === 0 ? (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 text-sm text-slate-600">
              {lang === 'en' ? 'No announcements yet.' : 'Belum ada pengumuman.'}
            </div>
          ) : (
            <div className="space-y-4 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
              {items.map((update) => {
                const title = lang === 'en' ? update.titleEn : update.titleId;
                const rawHtml = lang === 'en' ? update.contentEn : update.contentId;
                const excerpt = stripTagsForExcerpt(rawHtml, 160);
                const dateLabel = new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                }).format(new Date(`${update.publishDate}T12:00:00`));

                return (
                  <article
                    key={update.id}
                    className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-100"
                  >
                    {update.featuredImage ? (
                      <Link
                        href={`/updates/${update.id}`}
                        className="block relative aspect-video w-full bg-slate-100"
                      >
                        <Image
                          src={update.featuredImage}
                          alt={title}
                          fill
                          sizes="(max-width: 768px) 100vw, 480px"
                          className="object-cover"
                        />
                      </Link>
                    ) : null}
                    <div className="p-5">
                      <span className="text-xs text-slate-400 mb-2 block">{dateLabel}</span>
                      <h4 className="font-bold text-slate-700 text-lg mb-2 leading-tight">
                        <Link
                          href={`/updates/${update.id}`}
                          className="hover:text-primary transition-colors"
                        >
                          {title}
                        </Link>
                      </h4>
                      <p className="text-slate-600 text-sm mb-4 leading-relaxed line-clamp-3">
                        {excerpt}
                      </p>
                      <Link
                        href={`/updates/${update.id}`}
                        className="text-primary font-bold text-sm hover:underline"
                      >
                        {lang === 'en' ? 'Read More' : 'Baca Selengkapnya'}
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
          {nextCursor ? <div ref={sentinelRef} className="h-4 w-full" aria-hidden /> : null}
          {loading ? (
            <p className="text-center text-sm text-slate-500 py-2">
              {lang === 'en' ? 'Loading…' : 'Memuat…'}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
