"use client";

import { useSession, signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';
import { Header } from '@/components/portal/Header';
import { usePortalState } from '@/components/portal/state/PortalProvider';
import { t } from '@/lib/i18n/translations';

export function ProfilePageClient() {
  const { lang, portalChildren } = usePortalState();
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-slate-50 pb-6">
      <Header title={lang === 'en' ? 'Profile' : 'Profil'} backHref="/" />
      <div className="px-4 mt-4 space-y-4">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <p className="text-xs text-slate-500 font-semibold">{lang === 'en' ? 'Parent Information' : 'Data Orang Tua'}</p>
          <p className="text-lg font-bold text-slate-800 mt-1">{session?.user?.fullName ?? '-'}</p>
          <div className="mt-3 space-y-2 text-sm text-slate-600">
            <div className="flex items-center justify-between"><span>Email</span><span className="font-semibold">{session?.user?.email ?? '-'}</span></div>
            <div className="flex items-center justify-between">
              <span>{lang === 'en' ? 'Role' : 'Peran'}</span>
              <span className="font-semibold capitalize">{session?.user?.role ?? '-'}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <p className="text-xs text-slate-500 font-semibold">{lang === 'en' ? 'Children Information' : 'Data Anak'}</p>
          <div className="mt-4 space-y-3">
            {portalChildren.map((c) => (
              <div key={c.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50 flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-slate-700 leading-snug">{c.fullName}</p>
                  <p className="text-[10px] text-slate-500 leading-snug mt-0.5">{c.className ?? '—'}</p>
                  <p className="text-xs font-medium text-slate-600 leading-snug mt-0.5">{c.schoolName}</p>
                </div>
                <span className="text-slate-400">›</span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full mt-6 bg-white border border-red-200 text-red-500 font-bold py-3.5 rounded-full hover:bg-red-50 transition-colors flex items-center justify-center shadow-sm"
        >
          <LogOut size={18} className="mr-2" />
          {t(lang, 'logout')}
        </button>
      </div>
    </div>
  );
}

