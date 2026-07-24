'use client';

import type { Lang } from '@/lib/i18n/translations';
import { t, type TranslationKey } from '@/lib/i18n/translations';
import {
  addDaysISO,
  dayNumberFromWeekStart,
  todayISODate,
} from '@/lib/portal/weekly-plan-utils';

const WEEKDAY_KEYS: readonly TranslationKey[] = [
  'weekdayMon',
  'weekdayTue',
  'weekdayWed',
  'weekdayThu',
  'weekdayFri',
];

type TabMeta =
  | { kind: 'dot'; color: string }
  | { kind: 'count'; count: number };

type Props = {
  lang: Lang;
  dateFrom: string;
  selectedDayIndex: number;
  onSelect: (dayIndex: number) => void;
  /** Per-day meta: category color dot (KG) or lesson count (Primary). */
  metaForDay: (dayIndex: number) => TabMeta;
};

export function DayTabs({
  lang,
  dateFrom,
  selectedDayIndex,
  onSelect,
  metaForDay,
}: Props) {
  const today = todayISODate();
  const lessonWord = t(lang, 'scheduleLessonCount');

  return (
    <div className="flex gap-2">
      {WEEKDAY_KEYS.map((key, idx) => {
        const isOn = idx === selectedDayIndex;
        const dayIso = addDaysISO(dateFrom, idx);
        const isToday = dayIso === today;
        const meta = metaForDay(idx);
        const short = t(lang, key).slice(0, 3);
        const dateNum = dayNumberFromWeekStart(dateFrom, idx);

        return (
          <button
            key={key}
            type="button"
            title={t(lang, key)}
            onClick={() => onSelect(idx)}
            className={[
              'flex-1 flex flex-col items-center gap-1 rounded-[14px] px-1 py-2 border-[1.5px] transition-colors min-w-0',
              isOn
                ? 'bg-white border-slate-200 shadow-sm'
                : 'bg-[#F4F7F2] border-transparent hover:border-slate-200',
            ].join(' ')}
          >
            {meta.kind === 'dot' ? (
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: meta.color }}
                aria-hidden
              />
            ) : null}
            <span className="text-[11px] font-semibold text-slate-500">{short}</span>
            <span className="relative font-semibold text-[15px] text-slate-800 leading-none pb-1.5">
              {dateNum}
              {isToday ? (
                <span className="absolute left-1/2 -translate-x-1/2 bottom-0 w-1.5 h-1.5 rounded-full bg-[#F2A93B]" />
              ) : null}
            </span>
            {meta.kind === 'count' ? (
              <span className="text-[9.5px] text-slate-500 leading-tight text-center">
                {meta.count} {lessonWord}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
