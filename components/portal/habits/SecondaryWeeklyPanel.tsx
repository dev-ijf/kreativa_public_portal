'use client';

import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { ChevronDown } from 'lucide-react';
import { t, type Lang, type TranslationKey } from '@/lib/i18n/translations';
import type {
  EffortLevel,
  UnderstandingLevel,
} from '@/lib/portal/secondary-daily-shared';
import type {
  SecondaryWeeklyPayload,
  SecondaryWeeklyResponse,
} from '@/lib/portal/secondary-weekly-shared';
import { addDaysISO } from '@/lib/portal/weekly-plan-utils';
import { Textarea, TEXTAREA_NOTE_MAX } from '@/components/ui/Textarea';

type WeekSubTab = 'ibadah' | 'academic' | 'reflection' | 'goals';

const WEEKDAY_KEYS: readonly TranslationKey[] = [
  'weekdayMon',
  'weekdayTue',
  'weekdayWed',
  'weekdayThu',
  'weekdayFri',
];

const UNDERSTANDING: { value: UnderstandingLevel; key: TranslationKey }[] = [
  { value: 'fully', key: 'secUnderstandFully' },
  { value: 'mostly', key: 'secUnderstandMostly' },
  { value: 'partially', key: 'secUnderstandPartially' },
  { value: 'need_help', key: 'secUnderstandNeedHelp' },
];

const EFFORT: { value: EffortLevel; key: TranslationKey }[] = [
  { value: 'maximum', key: 'secEffortMaximum' },
  { value: 'good', key: 'secEffortGood' },
  { value: 'could_do_more', key: 'secEffortCouldDoMore' },
  { value: 'needs_improvement', key: 'secEffortNeedsImprovement' },
];

type Props = {
  lang: Lang;
  week: SecondaryWeeklyResponse;
  weekPayload: SecondaryWeeklyPayload;
  setWeekPayload: Dispatch<SetStateAction<SecondaryWeeklyPayload>>;
  weekSaveState: 'idle' | 'saving' | 'saved' | 'error';
  onSaveDraft: () => void;
  onSubmit: () => void;
  parentConfirmed: boolean;
  setParentConfirmed: (v: boolean) => void;
  parentName: string;
  setParentName: (v: string) => void;
  onSaveParentConfirm: () => void;
  onEnergyChange: (date: string, level: number) => void;
  energySaving: boolean;
};

function TextField({
  label,
  hint,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-2">
      <label className="font-bold text-slate-700 text-sm uppercase tracking-wide">
        {label}
      </label>
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
      <Textarea
        rows={rows}
        value={value}
        maxLength={TEXTAREA_NOTE_MAX}
        onChange={(e) => onChange(e.target.value.slice(0, TEXTAREA_NOTE_MAX))}
        placeholder={hint}
        className="rounded-xl border border-slate-200 p-3 text-sm"
      />
    </div>
  );
}

export function SecondaryWeeklyPanel({
  lang,
  week,
  weekPayload,
  setWeekPayload,
  weekSaveState,
  onSaveDraft,
  onSubmit,
  parentConfirmed,
  setParentConfirmed,
  parentName,
  setParentName,
  onSaveParentConfirm,
  onEnergyChange,
  energySaving,
}: Props) {
  const [subTab, setSubTab] = useState<WeekSubTab>('ibadah');
  const [openSubjectId, setOpenSubjectId] = useState<number | null>(
    week.weekSubjects[0]?.sessionId ?? null,
  );

  const periodDayCount = useMemo(
    () => week.dailyRecap.filter((d) => d.isOnPeriod).length,
    [week.dailyRecap],
  );

  const energyByDate = useMemo(() => {
    const map = new Map<string, number | null>();
    for (const d of week.dailyRecap) map.set(d.reportDate, d.energyLevel);
    return map;
  }, [week.dailyRecap]);

  const subTabs: { id: WeekSubTab; key: TranslationKey }[] = [
    { id: 'ibadah', key: 'secWeeklySubIbadah' },
    { id: 'academic', key: 'secWeeklySubAcademic' },
    { id: 'reflection', key: 'secWeeklySubReflection' },
    { id: 'goals', key: 'secWeeklySubGoals' },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
        <p className="font-bold text-slate-800">
          {week.weekLabel || `${week.dateFrom} – ${week.dateTo}`}
        </p>
        <p className="text-xs text-slate-500 mt-1">
          {week.dateFrom} → {week.dateTo}
          {week.status ? ` · ${week.status}` : ''}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {subTabs.map(({ id, key }) => (
          <button
            key={id}
            type="button"
            onClick={() => setSubTab(id)}
            className={[
              'px-4 py-2 rounded-full text-sm font-bold',
              subTab === id
                ? 'bg-primary text-white'
                : 'bg-slate-100 text-slate-700',
            ].join(' ')}
          >
            {t(lang, key)}
          </button>
        ))}
      </div>

      {subTab === 'ibadah' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-primary rounded-3xl p-5 text-white shadow-lg shadow-primary/25 space-y-3 lg:col-span-2">
            <p className="font-bold text-sm">{t(lang, 'secWeeklyStatsTitle')}</p>
            <p className="text-xs text-white/80">{t(lang, 'secWeeklyIbadahHint')}</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-white/80 text-xs">{t(lang, 'secWeeklyPrayers')}</p>
                <p className="font-black text-lg">
                  {week.stats.totalObligatoryPrayers}/{week.stats.maxObligatoryPrayers}
                </p>
              </div>
              <div>
                <p className="text-white/80 text-xs">{t(lang, 'secWeeklyDhuha')}</p>
                <p className="font-black text-lg">{week.stats.daysWithDhuha}</p>
              </div>
              <div>
                <p className="text-white/80 text-xs">{t(lang, 'secWeeklyTilawah')}</p>
                <p className="font-black text-lg">{week.stats.daysWithTilawah}</p>
              </div>
              <div>
                <p className="text-white/80 text-xs">{t(lang, 'secWeeklyDhikr')}</p>
                <p className="font-black text-lg">{week.stats.daysWithDhikr}</p>
              </div>
              {periodDayCount > 0 ? (
                <div className="col-span-2">
                  <p className="text-white/80 text-xs">{t(lang, 'secWeeklyPeriodDays')}</p>
                  <p className="font-black text-lg">{periodDayCount}</p>
                </div>
              ) : null}
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={parentConfirmed}
                onChange={(e) => setParentConfirmed(e.target.checked)}
                className="h-5 w-5 rounded border-slate-300 text-primary"
              />
              <span className="text-sm font-semibold text-slate-700">
                {t(lang, 'secParentConfirm')}
              </span>
            </label>
            <input
              type="text"
              placeholder={t(lang, 'secParentNamePlaceholder')}
              value={parentName}
              onChange={(e) => setParentName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-3 text-sm"
            />
            <button
              type="button"
              onClick={onSaveParentConfirm}
              className="w-full py-3 rounded-2xl font-bold text-sm bg-emerald-600 text-white"
            >
              {week.parentIbadahConfirmed
                ? t(lang, 'secParentConfirmed')
                : t(lang, 'secParentConfirmSave')}
            </button>
          </div>
        </div>
      ) : null}

      {subTab === 'academic' ? (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-3">
            <p className="font-bold text-slate-800">{t(lang, 'secWeeklyEnergyTitle')}</p>
            <p className="text-xs text-slate-500">{t(lang, 'secWeeklyEnergyHint')}</p>
            <div className="space-y-3">
              {[0, 1, 2, 3, 4].map((dayIndex) => {
                const date = addDaysISO(week.dateFrom, dayIndex);
                const level = energyByDate.get(date) ?? null;
                return (
                  <div
                    key={date}
                    className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3"
                  >
                    <span className="text-xs font-bold text-slate-600 w-24 shrink-0">
                      {t(lang, WEEKDAY_KEYS[dayIndex] ?? 'weekdayMon')}
                    </span>
                    <div className="flex gap-1.5 flex-wrap">
                      {([1, 2, 3, 4, 5] as const).map((n) => (
                        <button
                          key={n}
                          type="button"
                          disabled={energySaving}
                          onClick={() => onEnergyChange(date, n)}
                          className={[
                            'w-9 h-9 rounded-xl text-xs font-black border',
                            level === n
                              ? 'bg-primary text-white border-primary'
                              : 'bg-slate-50 text-slate-600 border-slate-200',
                          ].join(' ')}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-3 text-[13px] font-bold text-slate-800">
              {t(lang, 'secWeeklySubjectsTitle')}
            </p>
            {week.weekSubjects.length === 0 ? (
              <p className="text-sm text-slate-500">{t(lang, 'secWeeklySubjectsEmpty')}</p>
            ) : (
              <ul className="space-y-3">
                {week.weekSubjects.map((s) => {
                  const open = openSubjectId === s.sessionId;
                  return (
                    <li
                      key={s.sessionId}
                      className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setOpenSubjectId(open ? null : s.sessionId)
                        }
                        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left"
                      >
                        <div>
                          <p className="text-sm font-bold text-slate-800">
                            {s.subjectName}
                          </p>
                          <p className="text-xs text-slate-500">
                            {s.title} · {s.reportDate}
                          </p>
                        </div>
                        <ChevronDown
                          size={18}
                          className={`shrink-0 text-slate-400 transition-transform ${
                            open ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                      {open ? (
                        <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">
                          <p className="text-xs text-slate-500">
                            {lang === 'en'
                              ? 'Edit understanding & effort on the Daily tab for this date.'
                              : 'Ubah pemahaman & usaha di tab Harian untuk tanggal ini.'}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {UNDERSTANDING.map((o) => (
                              <span
                                key={o.value}
                                className={[
                                  'px-2.5 py-1 rounded-lg text-[11px] font-semibold border',
                                  s.understanding === o.value
                                    ? 'bg-primary/10 text-primary border-primary/30'
                                    : 'bg-slate-50 text-slate-400 border-slate-100',
                                ].join(' ')}
                              >
                                {t(lang, o.key)}
                              </span>
                            ))}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {EFFORT.map((o) => (
                              <span
                                key={o.value}
                                className={[
                                  'px-2.5 py-1 rounded-lg text-[11px] font-semibold border',
                                  s.effort === o.value
                                    ? 'bg-primary/10 text-primary border-primary/30'
                                    : 'bg-slate-50 text-slate-400 border-slate-100',
                                ].join(' ')}
                              >
                                {t(lang, o.key)}
                              </span>
                            ))}
                          </div>
                          {s.quickNote ? (
                            <p className="text-sm text-slate-600">{s.quickNote}</p>
                          ) : null}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}

      {subTab === 'reflection' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <TextField
            label={t(lang, 'secWeeklyBest')}
            hint={t(lang, 'secWeeklyBestHint')}
            value={weekPayload.bestLearningMoment ?? ''}
            onChange={(v) =>
              setWeekPayload((p) => ({ ...p, bestLearningMoment: v || null }))
            }
          />
          <TextField
            label={t(lang, 'secWeeklyChallenging')}
            hint={t(lang, 'secWeeklyChallengingHint')}
            value={weekPayload.mostChallenging ?? ''}
            onChange={(v) =>
              setWeekPayload((p) => ({ ...p, mostChallenging: v || null }))
            }
          />
          <TextField
            label={t(lang, 'secWeeklyQuestion')}
            hint={t(lang, 'secWeeklyQuestionHint')}
            value={weekPayload.unansweredQuestion ?? ''}
            onChange={(v) =>
              setWeekPayload((p) => ({ ...p, unansweredQuestion: v || null }))
            }
            rows={2}
          />
          <div className="lg:col-span-3">
            <TextField
              label={t(lang, 'secWeeklyAkhlaq')}
              hint={t(lang, 'secWeeklyAkhlaqHint')}
              value={weekPayload.akhlaqReflection ?? ''}
              onChange={(v) =>
                setWeekPayload((p) => ({ ...p, akhlaqReflection: v || null }))
              }
            />
          </div>
        </div>
      ) : null}

      {subTab === 'goals' ? (
        <div className="space-y-4">
          <p className="text-sm font-bold text-emerald-700">
            {t(lang, 'secWeeklyIntentionsTitle')}
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TextField
              label={t(lang, 'secWeeklyGoal')}
              hint={t(lang, 'secWeeklyGoalHint')}
              value={weekPayload.weeklyGoal ?? ''}
              onChange={(v) =>
                setWeekPayload((p) => ({ ...p, weeklyGoal: v || null }))
              }
              rows={4}
            />
            <TextField
              label={t(lang, 'secWeeklyMessage')}
              hint={t(lang, 'secWeeklyMessageHint')}
              value={weekPayload.messageToHomeroom ?? ''}
              onChange={(v) =>
                setWeekPayload((p) => ({ ...p, messageToHomeroom: v || null }))
              }
              rows={4}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={weekSaveState === 'saving'}
              onClick={onSaveDraft}
              className="flex-1 py-3 rounded-2xl font-bold text-sm border-2 border-primary text-primary bg-white"
            >
              {t(lang, 'secWeeklySaveDraft')}
            </button>
            <button
              type="button"
              disabled={weekSaveState === 'saving'}
              onClick={onSubmit}
              className="flex-1 py-3 rounded-2xl font-bold text-sm bg-emerald-600 text-white"
            >
              {t(lang, 'secWeeklySubmit')}
            </button>
          </div>
          <p className="text-center text-xs text-slate-500">
            {weekSaveState === 'saving' ? t(lang, 'secSaving') : null}
            {weekSaveState === 'saved' ? t(lang, 'secSaved') : null}
            {weekSaveState === 'error' ? t(lang, 'secSaveError') : null}
          </p>
        </div>
      ) : null}

      {subTab !== 'goals' ? (
        <div className="flex gap-2">
          <button
            type="button"
            disabled={weekSaveState === 'saving'}
            onClick={onSaveDraft}
            className="flex-1 py-3 rounded-2xl font-bold text-sm border-2 border-primary text-primary bg-white"
          >
            {t(lang, 'secWeeklySaveDraft')}
          </button>
          <button
            type="button"
            disabled={weekSaveState === 'saving'}
            onClick={onSubmit}
            className="flex-1 py-3 rounded-2xl font-bold text-sm bg-primary text-white"
          >
            {t(lang, 'secWeeklySubmit')}
          </button>
        </div>
      ) : null}
    </div>
  );
}
