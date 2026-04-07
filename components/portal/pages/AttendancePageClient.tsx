"use client";

import { Header } from '@/components/portal/Header';
import { ChildSelector } from '@/components/portal/ChildSelector';
import { usePortalState } from '@/components/portal/state/PortalProvider';
import { MOCK_ATTENDANCE } from '@/lib/data/mock/school';

export function AttendancePageClient() {
  const { lang, activeChildId } = usePortalState();
  const data = MOCK_ATTENDANCE[activeChildId];

  return (
    <div className="min-h-screen bg-slate-50 pb-6">
      <Header title={lang === 'en' ? 'Attendance' : 'Kehadiran'} backHref="/" />
      <ChildSelector />

      <div className="px-4 space-y-6">
        <div>
          <h3 className="font-bold text-slate-700 mb-3">{lang === 'en' ? 'Attendance Summary' : 'Ringkasan Kehadiran'}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-green-100">
              <p className="text-xs text-slate-500 font-semibold mb-1">{lang === 'en' ? 'Present' : 'Hadir'}</p>
              <p className="text-2xl font-bold text-green-600">{data.present}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-orange-100">
              <p className="text-xs text-slate-500 font-semibold mb-1">{lang === 'en' ? 'Sick' : 'Sakit'}</p>
              <p className="text-2xl font-bold text-orange-500">{data.sick}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-blue-100">
              <p className="text-xs text-slate-500 font-semibold mb-1">{lang === 'en' ? 'Permission' : 'Izin'}</p>
              <p className="text-2xl font-bold text-blue-500">{data.permission}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-red-100">
              <p className="text-xs text-slate-500 font-semibold mb-1">{lang === 'en' ? 'Absent' : 'Alpa'}</p>
              <p className="text-2xl font-bold text-red-500">{data.absent}</p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-bold text-slate-700 mb-3">{lang === 'en' ? 'Recent Absences' : 'Riwayat Terbaru'}</h3>
          <div className="space-y-3">
            {data.history.length === 0 ? (
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 text-center text-slate-400 text-sm">
                {lang === 'en' ? 'No history.' : 'Tidak ada riwayat.'}
              </div>
            ) : (
              data.history.map((h, i) => (
                <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-700 text-sm">{lang === 'en' ? h.noteEn : h.noteId}</p>
                    <p className="text-xs text-slate-500">{h.date}</p>
                  </div>
                  <span
                    className={[
                      'text-xs font-bold px-2.5 py-1 rounded-md capitalize',
                      h.status === 'sick' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700',
                    ].join(' ')}
                  >
                    {h.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

