"use client";

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Award,
  BookOpen,
  Brain,
  Calendar,
  CheckSquare,
  Home,
  LogOut,
  Megaphone,
  PanelLeftClose,
  PanelLeftOpen,
  Receipt,
  User,
} from 'lucide-react';
import { signOut } from 'next-auth/react';
import { usePortalState, useActiveChild } from '@/components/portal/state/PortalProvider';
import { isKindergartenStudent } from '@/lib/portal/is-kindergarten';
import { t } from '@/lib/i18n/translations';
import { useSidebar } from './SidebarProvider';
import { isModuleActive, type ModuleActiveMap } from '@/lib/portal/menu-config';

type NavItem = {
  href: string;
  icon: React.ReactNode;
  labelKey: string;
  labelOverride?: string;
  moduleCode?: string;
};

type Props = {
  logoUrl: string;
  logoAlt: string;
  moduleActiveMap: ModuleActiveMap;
};

export function Sidebar({ logoUrl, logoAlt, moduleActiveMap }: Props) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { lang, setLang } = usePortalState();
  const activeChild = useActiveChild();
  const { expanded, toggle } = useSidebar();

  const navItems: NavItem[] = [
    { href: '/', icon: <Home size={20} />, labelKey: 'quickMenus', labelOverride: lang === 'en' ? 'Home' : 'Beranda' },
    { href: '/finance', icon: <Receipt size={20} />, labelKey: 'tuition', moduleCode: 'financial' },
    { href: '/schedules', icon: <BookOpen size={20} />, labelKey: 'schedules', moduleCode: 'schedules' },
    { href: '/attendance', icon: <CheckSquare size={20} />, labelKey: 'attendance', moduleCode: 'attendance' },
    { href: '/report', icon: <Award size={20} />, labelKey: 'report', moduleCode: 'report' },
    { href: '/agenda', icon: <Calendar size={20} />, labelKey: 'agenda', moduleCode: 'agenda' },
    { href: '/updates', icon: <Megaphone size={20} />, labelKey: 'updates', moduleCode: 'updates' },
    { href: '/adaptive-learning', icon: <Brain size={20} />, labelKey: 'adaptiveLearning', moduleCode: 'adaptive-learning' },
    {
      href: '/habits',
      icon: <CheckSquare size={20} />,
      labelKey: isKindergartenStudent(activeChild ?? {}) ? 'dailyReports' : 'habits',
      moduleCode: 'habits',
    },
  ];

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  };

  const displayName = session?.user?.role === 'parent'
    ? `${t(lang, 'honorific')} ${session.user.fullName ?? ''}`.trim()
    : session?.user?.fullName ?? '';

  return (
    <>
      {/* Sidebar panel */}
      <aside
        className={[
          'hidden md:flex flex-col min-h-screen bg-primary shrink-0 z-20 overflow-hidden transition-all duration-300 ease-in-out',
          expanded ? 'w-64' : 'w-0',
        ].join(' ')}
      >
        <div className="w-64 min-w-[16rem] flex flex-col min-h-screen">
          {/* Top: toggle */}
          <div className="px-3 pt-3 pb-1 flex justify-end">
            <button
              type="button"
              onClick={toggle}
              className="p-2 rounded-lg text-white/50 hover:bg-white/10 hover:text-white/80 transition-colors"
              aria-label={lang === 'en' ? 'Collapse sidebar' : 'Tutup sidebar'}
            >
              <PanelLeftClose size={18} />
            </button>
          </div>

          {/* Logo */}
          <div className="px-4 pb-4 flex justify-center">
            <Link href="/" className="block w-full">
              <div className="relative h-28 w-full">
                <Image
                  src={logoUrl}
                  alt={logoAlt}
                  fill
                  sizes="240px"
                  className="object-contain object-center"
                  priority
                />
              </div>
            </Link>
          </div>

          {/* Greeting */}
          <div className="px-4 pb-3 border-b border-white/15">
            <p className="text-xs text-white/60">{t(lang, 'greeting')}</p>
            <p className="text-sm font-bold text-white truncate">{displayName}</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
            {navItems.map((item) => {
              const active = isActive(item.href);
              const label = item.labelOverride ?? t(lang, item.labelKey as Parameters<typeof t>[1]);
              const moduleActive = item.moduleCode
                ? isModuleActive(moduleActiveMap, item.moduleCode)
                : true;

              if (!moduleActive) {
                return (
                  <div
                    key={item.href}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/30 cursor-not-allowed"
                  >
                    {item.icon}
                    <span className="truncate">{label}</span>
                  </div>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-sm font-medium',
                    active
                      ? 'bg-white/20 text-white'
                      : 'text-white/75 hover:bg-white/10 hover:text-white',
                  ].join(' ')}
                >
                  {item.icon}
                  <span className="truncate">{label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Bottom: profile + lang toggle */}
          <div className="px-3 py-3 border-t border-white/15 space-y-1.5">
            <Link
              href="/profile"
              className={[
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-sm font-medium',
                pathname === '/profile'
                  ? 'bg-white/20 text-white'
                  : 'text-white/75 hover:bg-white/10 hover:text-white',
              ].join(' ')}
            >
              <User size={20} />
              <span>{lang === 'en' ? 'Profile' : 'Profil'}</span>
            </Link>

            <button
              type="button"
              onClick={() => setLang(lang === 'en' ? 'id' : 'en')}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-white/60 hover:bg-white/10 hover:text-white transition-colors border border-white/20"
            >
              {t(lang, 'langBtn')} — {lang === 'en' ? 'Switch to Bahasa' : 'Switch to English'}
            </button>

            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-sm font-medium text-red-300 hover:bg-white/10 hover:text-red-200"
            >
              <LogOut size={20} />
              <span>{lang === 'en' ? 'Logout' : 'Keluar'}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Floating expand button when sidebar is collapsed */}
      {!expanded && (
        <button
          type="button"
          onClick={toggle}
          className="hidden md:flex fixed top-4 left-4 z-30 items-center justify-center w-10 h-10 rounded-xl bg-primary shadow-md text-white/80 hover:text-white hover:bg-primary/90 transition-colors"
          aria-label={lang === 'en' ? 'Open sidebar' : 'Buka sidebar'}
        >
          <PanelLeftOpen size={20} />
        </button>
      )}
    </>
  );
}
