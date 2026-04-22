"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Award, BookOpen, Brain, Calendar, CheckSquare, Megaphone, Receipt, User } from 'lucide-react';
import { TopHero } from '@/components/portal/TopHero';
import { usePortalState } from '@/components/portal/state/PortalProvider';
import { t } from '@/lib/i18n/translations';
import { MOCK_BANNERS, MOCK_CHILDREN, MOCK_UPCOMING_EVENTS } from '@/lib/data/mock/home';

export function HomePageClient() {
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const { data: session } = useSession();
  const { lang, setLang, activeChildId, setActiveChildId } = usePortalState();
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

  const activeChild = MOCK_CHILDREN.find((c) => c.id === activeChildId) ?? MOCK_CHILDREN[0];

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
              <p className="text-sm opacity-90">{t(lang, 'greeting')}</p>
              <h1 className="text-xl font-bold">
                {session?.user?.role === 'parent'
                  ? `${t(lang, 'honorific')} ${session.user.fullName}`
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
              {MOCK_BANNERS.map((banner, idx) => (
                <Link
                  key={idx}
                  href={banner.type === 'update' ? `/updates/${banner.updateId}` : banner.link}
                  target={banner.type === 'web' ? '_blank' : undefined}
                  className="snap-start shrink-0 w-[280px] rounded-2xl overflow-hidden bg-white shadow-sm"
                >
                  <div className="relative h-[140px] w-full">
                    {banner.image ? (
                      <Image src={banner.image} alt={banner.title} fill sizes="280px" className="object-cover" />
                    ) : (
                      <div className="h-full w-full bg-slate-100" />
                    )}
                    <div className="absolute inset-0 bg-linear-to-t from-black/55 via-black/10 to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3">
                      <p className="text-white font-semibold text-sm leading-tight">{banner.title}</p>
                      {banner.subtitle ? <p className="text-white/85 text-xs mt-0.5">{banner.subtitle}</p> : null}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* keep hero bottom clean; selector will float between sections */}
        </div>
      </TopHero>

      {/* Child selector floating between hero and content */}
      <div className="relative z-20 -mt-4 px-4">
        <div className="w-full">
          <div>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
              {MOCK_CHILDREN.map((child) => (
                <button
                  key={child.id}
                  onClick={() => setActiveChildId(child.id)}
                  className={[
                    'shrink-0 flex items-center px-3 py-2 rounded-full border transition-all',
                    activeChildId === child.id
                      ? 'border-primary bg-primary-light shadow-sm'
                      : 'border-slate-200 bg-white hover:bg-slate-50',
                  ].join(' ')}
                >
                  <div
                    className={[
                      'w-8 h-8 rounded-full flex items-center justify-center mr-2 text-lg',
                      activeChildId === child.id
                        ? 'bg-primary text-white border-2 border-primary-light'
                        : 'bg-slate-100 text-slate-500 border border-slate-200',
                    ].join(' ')}
                  >
                    {child.avatar}
                  </div>
                  <div className="text-left pr-1">
                    <p className={['font-bold text-sm leading-tight', activeChildId === child.id ? 'text-primary' : 'text-slate-700'].join(' ')}>
                      {child.name.split(' ')[0]}
                    </p>
                    <p className="text-[10px] text-slate-500 -mt-0.5">{child.gradeLabel}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-20 px-4 pt-3 pb-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          {t(lang, 'selectChild')}
        </p>
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
              {MOCK_UPCOMING_EVENTS.slice(0, 3).map((e) => (
                <div key={e.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-700 leading-tight">{e.title}</p>
                    <p className="text-xs text-slate-500">{e.dateLabel}</p>
                  </div>
                  <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">{e.type}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-500">
                Active child: <span className="font-bold text-slate-700">{activeChild.name}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

