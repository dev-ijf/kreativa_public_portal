"use client";

import { useMemo, useState } from 'react';
import { Header } from '@/components/portal/Header';
import { ChildSelector } from '@/components/portal/ChildSelector';
import { usePortalState } from '@/components/portal/state/PortalProvider';

type HabitState = {
  fajr: boolean;
  dhuhr: boolean;
  asr: boolean;
  maghrib: boolean;
  isha: boolean;
  dhuha: boolean;
  tahajud: boolean;
  read_quran: boolean;
  wake_up_early: boolean;
  help_parents: boolean;
};

function HabitItem({
  checked,
  label,
  onToggle,
}: {
  checked: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-slate-100"
    >
      <span className="font-bold text-slate-700 text-sm">{label}</span>
      <span
        className={[
          'w-6 h-6 rounded-full flex items-center justify-center text-xs font-black',
          checked ? 'bg-emerald-500 text-white' : 'bg-white border border-slate-200 text-slate-400',
        ].join(' ')}
      >
        {checked ? '✓' : ''}
      </span>
    </button>
  );
}

export function HabitsPageClient() {
  const { lang } = usePortalState();
  const [tab, setTab] = useState<'daily' | 'summary'>('daily');
  const [data, setData] = useState<HabitState>({
    fajr: false,
    dhuhr: false,
    asr: false,
    maghrib: false,
    isha: false,
    dhuha: false,
    tahajud: false,
    read_quran: false,
    wake_up_early: false,
    help_parents: false,
  });

  const completion = useMemo(() => {
    const vals = Object.values(data);
    const done = vals.filter(Boolean).length;
    return Math.round((done / vals.length) * 100);
  }, [data]);

  return (
    <div className="min-h-screen bg-slate-50 pb-6">
      <Header title={lang === 'en' ? 'Habits' : 'Pembiasaan'} backHref="/" />
      <ChildSelector />

      <div className="px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-2 flex gap-2">
          <button
            onClick={() => setTab('daily')}
            className={['flex-1 py-2.5 rounded-xl font-bold text-sm', tab === 'daily' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700'].join(' ')}
          >
            {lang === 'en' ? 'Daily Entry' : 'Harian'}
          </button>
          <button
            onClick={() => setTab('summary')}
            className={['flex-1 py-2.5 rounded-xl font-bold text-sm', tab === 'summary' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700'].join(' ')}
          >
            {lang === 'en' ? 'Summary' : 'Rekap'}
          </button>
        </div>

        {tab === 'daily' ? (
          <div className="mt-4 space-y-4">
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-700 mb-3">{lang === 'en' ? 'Obligatory Prayers' : 'Shalat Wajib'}</h3>
              <div className="space-y-2">
                <HabitItem checked={data.fajr} label={lang === 'en' ? 'Fajr' : 'Subuh'} onToggle={() => setData((p) => ({ ...p, fajr: !p.fajr }))} />
                <HabitItem checked={data.dhuhr} label={lang === 'en' ? 'Dhuhr' : 'Dzuhur'} onToggle={() => setData((p) => ({ ...p, dhuhr: !p.dhuhr }))} />
                <HabitItem checked={data.asr} label={lang === 'en' ? 'Asr' : 'Ashar'} onToggle={() => setData((p) => ({ ...p, asr: !p.asr }))} />
                <HabitItem checked={data.maghrib} label="Maghrib" onToggle={() => setData((p) => ({ ...p, maghrib: !p.maghrib }))} />
                <HabitItem checked={data.isha} label={lang === 'en' ? 'Isha' : 'Isya'} onToggle={() => setData((p) => ({ ...p, isha: !p.isha }))} />
              </div>
            </div>

            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-700 mb-3">{lang === 'en' ? 'Sunnah Prayers' : 'Shalat Sunnah'}</h3>
              <div className="space-y-2">
                <HabitItem checked={data.dhuha} label="Dhuha" onToggle={() => setData((p) => ({ ...p, dhuha: !p.dhuha }))} />
                <HabitItem checked={data.tahajud} label="Tahajud" onToggle={() => setData((p) => ({ ...p, tahajud: !p.tahajud }))} />
              </div>
            </div>

            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-700 mb-3">{lang === 'en' ? 'Daily Good Habits' : 'Kebaikan Harian'}</h3>
              <div className="space-y-2">
                <HabitItem checked={data.read_quran} label={lang === 'en' ? 'Read Quran after Maghrib' : 'Mengaji setelah Maghrib'} onToggle={() => setData((p) => ({ ...p, read_quran: !p.read_quran }))} />
                <HabitItem checked={data.wake_up_early} label={lang === 'en' ? 'Wake up before 5 AM' : 'Bangun sebelum jam 5'} onToggle={() => setData((p) => ({ ...p, wake_up_early: !p.wake_up_early }))} />
                <HabitItem checked={data.help_parents} label={lang === 'en' ? 'Help Parents' : 'Membantu orang tua'} onToggle={() => setData((p) => ({ ...p, help_parents: !p.help_parents }))} />
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <div className="bg-primary rounded-3xl p-5 text-white shadow-lg shadow-primary/25 mb-6">
              <div className="flex justify-between items-center mb-4">
                <span className="font-bold flex items-center">📊 {lang === 'en' ? 'Weekly Progress Summary' : 'Ringkasan Mingguan'}</span>
              </div>
              <div>
                <p className="text-xs text-white/70 mb-1">{lang === 'en' ? 'Completion Rate' : 'Tingkat Kepatuhan'}</p>
                <p className="text-4xl font-bold">{completion}%</p>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-5">
              <div>
                <div className="flex justify-between text-sm text-slate-700 mb-2">
                  <span className="font-medium">{lang === 'en' ? 'Obligatory Prayers' : 'Shalat Wajib'}</span>
                  <span className="font-semibold">90%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5">
                  <div className="bg-emerald-500 h-2.5 rounded-full w-[90%]" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm text-slate-700 mb-2">
                  <span className="font-medium">{lang === 'en' ? 'Sunnah Prayers' : 'Shalat Sunnah'}</span>
                  <span className="font-semibold">40%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5">
                  <div className="bg-orange-500 h-2.5 rounded-full w-[40%]" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm text-slate-700 mb-2">
                  <span className="font-medium">{lang === 'en' ? 'Good Habits' : 'Kebaikan Harian'}</span>
                  <span className="font-semibold">85%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5">
                  <div className="bg-blue-500 h-2.5 rounded-full w-[85%]" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

