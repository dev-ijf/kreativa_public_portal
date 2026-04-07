"use client";

import { useMemo, useState } from 'react';
import { Header } from '@/components/portal/Header';
import { ChildSelector } from '@/components/portal/ChildSelector';
import { usePortalState } from '@/components/portal/state/PortalProvider';
import { MOCK_AGENDA } from '@/lib/data/mock/school';

export function AgendaPageClient() {
  const { lang, activeChildId } = usePortalState();
  const [currentMonth, setCurrentMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const currentMonthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const childAgenda = useMemo(() => MOCK_AGENDA[activeChildId] ?? [], [activeChildId]);

  const weekDays = lang === 'en' ? ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] : ['Mi', 'Se', 'Sl', 'Ra', 'Ka', 'Ju', 'Sa'];

  const displayedEvents = useMemo(() => {
    return selectedDateStr ? childAgenda.filter((ev) => ev.date === selectedDateStr) : childAgenda.filter((ev) => ev.date.startsWith(currentMonthPrefix));
  }, [childAgenda, currentMonthPrefix, selectedDateStr]);

  const monthTitle = currentMonth.toLocaleString(lang === 'en' ? 'en-US' : 'id-ID', { month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-slate-50 pb-6">
      <Header title={lang === 'en' ? 'Agenda' : 'Agenda'} backHref="/" />
      <ChildSelector />

      <div className="px-4 space-y-6">
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-4">
            <button onClick={() => { setCurrentMonth(new Date(year, month - 1, 1)); setSelectedDateStr(null); }} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-600" aria-label="Prev month">
              ‹
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
                aria-label="Month"
              />
              <h3 className="font-bold text-slate-700 text-lg flex items-center">
                {monthTitle}
                <span className="ml-1 text-slate-400">▾</span>
              </h3>
            </div>
            <button onClick={() => { setCurrentMonth(new Date(year, month + 1, 1)); setSelectedDateStr(null); }} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-600" aria-label="Next month">
              ›
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
              const hasEvent = childAgenda.some((ev) => ev.date === dateStr);
              const isSelected = selectedDateStr === dateStr;
              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDateStr(isSelected ? null : dateStr)}
                  className={[
                    'relative p-2 h-10 flex flex-col items-center justify-center rounded-xl transition-colors',
                    isSelected ? 'bg-primary text-white shadow-md' : 'text-slate-700 hover:bg-slate-100',
                  ].join(' ')}
                >
                  <span className={['text-sm font-bold', isSelected ? 'text-white' : ''].join(' ')}>{day}</span>
                  {hasEvent ? <div className={['w-1 h-1 rounded-full mt-0.5', isSelected ? 'bg-white' : 'bg-red-500'].join(' ')} /> : null}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="font-bold text-slate-700 mb-3 px-1">
            {selectedDateStr ? selectedDateStr : (lang === 'en' ? 'Events This Month' : 'Agenda Bulan Ini')}
          </h3>
          <div className="space-y-3">
            {displayedEvents.length === 0 ? (
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 text-center text-slate-400 text-sm">
                {lang === 'en' ? 'No events scheduled.' : 'Tidak ada agenda.'}
              </div>
            ) : (
              displayedEvents.map((ev) => (
                <div key={ev.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-start">
                  <div className="bg-primary-light rounded-xl p-2 mr-3 text-primary shrink-0">🗓️</div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-700 text-sm mb-1">{lang === 'en' ? ev.titleEn : ev.titleId}</p>
                    <p className="text-xs text-slate-500 flex items-center mb-1">⏰ {ev.time}</p>
                    {!selectedDateStr ? (
                      <p className="text-[10px] text-indigo-500 font-bold bg-indigo-50 inline-block px-2 py-0.5 rounded-md mt-1">{ev.date}</p>
                    ) : null}
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

