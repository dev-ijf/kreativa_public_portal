"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Award, BookOpen, Brain, Calendar, CheckSquare, Megaphone, Receipt, User } from 'lucide-react';
import { TopHero } from '@/components/portal/TopHero';
import { ChildSelector } from '@/components/portal/ChildSelector';
import { usePortalState, useActiveChild } from '@/components/portal/state/PortalProvider';
import { t, type Lang } from '@/lib/i18n/translations';
import type { PortalAgendaRow } from '@/lib/data/server/agendas';
import type { PortalAnnouncementRow } from '@/lib/data/server/announcements';
import { agendaForChild } from '@/lib/portal/agenda-filter';

function todayLocalISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

type Props = {
  initialAgendas: PortalAgendaRow[];
  initialAnnouncements: PortalAnnouncementRow[];
};

export function HomePageClient({ initialAgendas, initialAnnouncements }: Props) {
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const { data: session } = useSession();
  const { lang, setLang } = usePortalState();
  const activeChild = useActiveChild();
  const [now, setNow] = useState(() => new Date());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    const clockId = window.setInterval(() => setNow(new Date()), 1000);
    const scrollId = window.setInterval(() => {
      const el = carouselRef.current;
      if (!el) return;
      const { scrollLeft, scrollWidth, clientWidth } = el;
      if (scrollLeft + clientWidth >= scrollWidth - 10) el.scrollTo({ left: 0, behavior: 'smooth' });
      else el.scrollBy({ left: clientWidth * 0.85, behavior: 'smooth' });
    }, 4000);

    return () => {
      window.clearInterval(clockId);
      window.clearInterval(scrollId);
    };
  }, []);

  const formattedDate = useMemo(() => {
    return new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(now);
  }, [lang, now]);

  const formattedTime = useMemo(() => {
    return now.toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }, [now]);

  // Avoid hydration mismatch: server + first client paint use English copy; after mount, follow portal lang.
  const stableLang: Lang = mounted ? lang : 'en';

  const upcomingForHome = useMemo(() => {
    if (!activeChild) return [];
    const childRows = agendaForChild(
      initialAgendas,
      activeChild.schoolId,
      activeChild.levelGradeName,
    );
    const today = todayLocalISO();
    return childRows
      .filter((ev) => ev.eventDate >= today)
      .sort((a, b) => (a.eventDate < b.eventDate ? 1 : a.eventDate > b.eventDate ? -1 : Number(b.id) - Number(a.id)))
      .slice(0, 5);
  }, [initialAgendas, activeChild]);

  const menus = [
    { href: '/finance', label: t(lang, 'tuition'), color: 'bg-indigo-100', icon: <Receipt size={28} className="text-primary" /> },
    { href: '/academic', label: t(lang, 'academic'), color: 'bg-blue-100', icon: <BookOpen size={28} className="text-blue-600" /> },
    { href: '/attendance', label: t(lang, 'attendance'), color: 'bg-orange-100', icon: <CheckSquare size={28} className="text-orange-600" /> },
    { href: '/report', label: t(lang, 'report'), color: 'bg-purple-100', icon: <Award size={28} className="text-purple-600" /> },
    { href: '/agenda', label: t(lang, 'agenda'), color: 'bg-red-100', icon: <Calendar size={28} className="text-red-600" /> },
    { href: '/updates', label: t(lang, 'updates'), color: 'bg-teal-100', icon: <Megaphone size={28} className="text-teal-600" /> },
    { href: '/adaptive-learning', label: t(lang, 'adaptiveLearning'), color: 'bg-pink-100', icon: <Brain size={28} className="text-pink-600" /> },
    { href: '/habits', label: t(lang, 'habits'), color: 'bg-emerald-100', icon: <CheckSquare size={28} className="text-emerald-600" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <TopHero>
        <div className="pt-4">
          <div className="flex justify-between items-start px-4 mb-4 text-white">
            <div className="flex flex-col items-start">
              <div className="h-10 w-[140px] relative mb-4">
                <Image
                  src="/assets/tenant/kreativa-logo.png"
                  alt="Kreativa Global"
                  fill
                  sizes="140px"
                  className="object-contain"
                  priority
                />
              </div>
              <p className="text-sm opacity-90">{t(stableLang, 'greeting')}</p>
              <h1 className="text-xl font-bold">
                {session?.user?.role === 'parent'
                  ? `${t(stableLang, 'honorific')} ${session.user.fullName ?? ''}`.trim()
                  : session?.user?.fullName ?? ''}
              </h1>
            </div>

            <div className="flex flex-col items-end mt-1">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setLang(lang === 'en' ? 'id' : 'en')}
                  className="bg-white/20 hover:bg-white/30 text-white font-semibold py-1.5 px-3.5 rounded-full text-xs transition-colors flex items-center shadow-sm border border-white/10"
                >
                  {t(lang, 'langBtn')}
                </button>
                <Link href="/profile" className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition" aria-label="Profile">
                  <User size={18} />
                </Link>
              </div>
              <div className="mt-5 text-right">
                <p
                  className="text-[10px] text-indigo-200 font-semibold uppercase tracking-wider mb-0.5"
                  suppressHydrationWarning
                >
                  {mounted ? formattedDate : ''}
                </p>
                <p className="text-sm font-bold text-white tracking-widest" suppressHydrationWarning>
                  {mounted ? formattedTime : ''}
                </p>
              </div>
            </div>
          </div>

          <div className="mb-2 w-full">
            <div ref={carouselRef} className="flex space-x-3 overflow-x-auto pb-4 pl-4 snap-x snap-mandatory scroll-smooth scrollbar-hide">
              {initialAnnouncements.length === 0 ? (
                <div className="snap-start shrink-0 w-[280px] rounded-lg overflow-hidden bg-white/10 border border-white/20 p-4 text-white/80 text-sm">
                  {stableLang === 'en' ? 'No announcements yet.' : 'Belum ada pengumuman.'}
                </div>
              ) : (
                initialAnnouncements.map((ann) => {
                  const title = stableLang === 'en' ? ann.titleEn : ann.titleId;
                  const subtitle = new Intl.DateTimeFormat(stableLang === 'en' ? 'en-GB' : 'id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  }).format(new Date(`${ann.publishDate}T12:00:00`));
                  return (
                    <Link
                      key={ann.id}
                      href={`/updates/${ann.id}`}
                      className="snap-start shrink-0 w-[280px] rounded-lg overflow-hidden bg-white shadow-sm"
                    >
                      <div className="relative h-[140px] w-full">
                        {ann.featuredImage ? (
                          <Image
                            src={ann.featuredImage}
                            alt={title}
                            fill
                            sizes="280px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="h-full w-full bg-slate-200" />
                        )}
                        <div className="absolute inset-0 bg-linear-to-t from-black/55 via-black/10 to-transparent" />
                        <div className="absolute bottom-3 left-3 right-3">
                          <p className="text-white font-semibold text-sm leading-tight">{title}</p>
                          <p className="text-white/85 text-xs mt-0.5">{subtitle}</p>
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>

          {/* keep hero bottom clean; selector will float between sections */}
        </div>
      </TopHero>

      <div className="relative z-20 -mt-4">
        <ChildSelector />
      </div>

      <div className="relative z-10 pb-6">
        <div className="px-4">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-slate-700">{t(lang, 'quickMenus')}</p>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {menus.map((m) => (
                <Link key={m.href} href={m.href} className="flex flex-col items-center text-center">
                  <div className={['w-14 h-14 rounded-2xl flex items-center justify-center', m.color].join(' ')}>
                    {m.icon}
                  </div>
                  <p className="text-xs font-semibold text-slate-600 mt-2 leading-tight">{m.label}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="px-4 mt-4">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-slate-700">{t(lang, 'upcomingEvents')}</p>
              <Link href="/agenda" className="text-xs font-bold text-primary">
                {t(lang, 'seeAll')}
              </Link>
            </div>
            <div className="space-y-3">
              {!activeChild ? (
                <p className="text-sm text-slate-500">
                  {lang === 'en' ? 'Select a student to see upcoming events.' : 'Pilih siswa untuk melihat agenda mendatang.'}
                </p>
              ) : upcomingForHome.length === 0 ? (
                <p className="text-sm text-slate-500">
                  {lang === 'en' ? 'No upcoming events.' : 'Tidak ada agenda mendatang.'}
                </p>
              ) : (
                upcomingForHome.map((e) => {
                  const dateLabel = new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'id-ID', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  }).format(new Date(`${e.eventDate}T12:00:00`));
                  return (
                    <Link
                      key={e.id}
                      href="/agenda"
                      className="flex items-center justify-between rounded-xl hover:bg-slate-50 -mx-1 px-1 py-0.5 transition-colors"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-sm font-semibold text-slate-700 leading-tight truncate">
                          {lang === 'en' ? e.titleEn : e.titleId}
                        </p>
                        <p className="text-xs text-slate-500">{dateLabel}</p>
                      </div>
                      <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full shrink-0">
                        {e.eventType}
                      </span>
                    </Link>
                  );
                })
              )}
            </div>
            {activeChild && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs text-slate-500">
                  Active child: <span className="font-bold text-slate-700">{activeChild.fullName}</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

