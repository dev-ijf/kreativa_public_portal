"use client";

import Link from 'next/link';
import { Header } from '@/components/portal/Header';
import { usePortalState } from '@/components/portal/state/PortalProvider';
import { MOCK_CHILDREN } from '@/lib/data/mock/home';

export function ProfilePageClient() {
  const { lang } = usePortalState();

  return (
    <div className="min-h-screen bg-slate-50 pb-6">
      <Header title={lang === 'en' ? 'Profile' : 'Profil'} backHref="/" />
      <div className="px-4 mt-4 space-y-4">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <p className="text-xs text-slate-500 font-semibold">{lang === 'en' ? 'Parent Information' : 'Data Orang Tua'}</p>
          <p className="text-lg font-bold text-slate-800 mt-1">Ahmad Santoso</p>
          <div className="mt-3 space-y-2 text-sm text-slate-600">
            <div className="flex items-center justify-between"><span>{lang === 'en' ? 'Phone' : 'Telepon'}</span><span className="font-semibold">+62 812-3456-7890</span></div>
            <div className="flex items-center justify-between"><span>Email</span><span className="font-semibold">ahmad.santoso@email.com</span></div>
            <div className="flex items-start justify-between gap-6"><span>{lang === 'en' ? 'Address' : 'Alamat'}</span><span className="font-semibold text-right">Jl. Merdeka No. 45, Jakarta Selatan</span></div>
          </div>
          <button className="mt-4 w-full inline-flex items-center justify-center bg-slate-700 text-white font-bold px-6 py-3 rounded-full hover:bg-slate-600">
            {lang === 'en' ? 'Edit Profile' : 'Edit Profil'}
          </button>
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

        <Link href="/login" className="w-full inline-flex items-center justify-center bg-white border border-slate-200 text-slate-700 font-bold px-6 py-3 rounded-full hover:bg-slate-50">
          {lang === 'en' ? 'Logout' : 'Keluar'}
        </Link>
      </div>
    </div>
  );
}

