"use client";

import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { Header } from '@/components/portal/Header';
import { ChildSelector } from '@/components/portal/ChildSelector';
import { usePortalState, useActiveChild } from '@/components/portal/state/PortalProvider';
import type { PortalAgendaRow } from '@/lib/data/server/agendas';
import { agendaForChild } from '@/lib/portal/agenda-filter';

type Props = {
  initialAgendas: PortalAgendaRow[];
};

export function AgendaPageClient({ initialAgendas }: Props) {
  const { lang } = usePortalState();
  const activeChild = useActiveChild();
  const [currentMonth, setCurrentMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
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

  const monthTitle = currentMonth.toLocaleString(lang === 'en' ? 'en-US' : 'id-ID', { month: 'long', year: 'numeric' });

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

  return (
    <div className="min-h-screen bg-slate-50 pb-6">
      <Header title={lang === 'en' ? 'Agenda' : 'Agenda'} backHref="/" />
      <ChildSelector />

      <div className="px-4 space-y-6">
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
                <div key={ev.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-start gap-3">
                  <div className="bg-violet-100 rounded-xl p-2 text-violet-700 shrink-0">
                    <CalendarDays size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 text-sm mb-1">{lang === 'en' ? ev.titleEn : ev.titleId}</p>
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
                          {ev.targetGrade ??
                            (lang === 'en' ? 'All grades' : 'Semua kelas')}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap ml-auto">{ev.schoolName}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
