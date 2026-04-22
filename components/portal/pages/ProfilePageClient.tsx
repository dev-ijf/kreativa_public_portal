"use client";

import { useSession, signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';
import { Header } from '@/components/portal/Header';
import { usePortalState } from '@/components/portal/state/PortalProvider';
import { MOCK_CHILDREN } from '@/lib/data/mock/home';
import { t } from '@/lib/i18n/translations';

export function ProfilePageClient() {
  const { lang } = usePortalState();
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
            {MOCK_CHILDREN.map((c) => (
              <div key={c.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-lg mr-3">{c.avatar}</div>
                  <div>
                    <p className="font-bold text-slate-700">{c.name}</p>
                    <p className="text-xs text-slate-500">{c.gradeLabel}</p>
                  </div>
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

