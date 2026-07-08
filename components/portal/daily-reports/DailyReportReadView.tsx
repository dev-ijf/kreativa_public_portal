"use client";

import {
  DHUHA_KEYS,
  LUNCH_KEYS,
  MOOD_EMOJI,
  MOOD_KEYS,
  WATER_KEYS,
  ZUHUR_KEYS,
  type DailyReportFull,
  type DailyReportTilawah,
} from "@/lib/portal/daily-reports-shared";
import { t, type Lang } from "@/lib/i18n/translations";
import {
  FieldCaption,
  FieldLabel,
  ReadOnlyField,
  ReadOnlyLearningAreaList,
  ReadOnlyMultiPills,
  ReadOnlyPills,
  ReportSectionShell,
  StarRating,
} from "@/components/portal/daily-reports/ReportSectionShell";
import { ClassReportSection } from "@/components/portal/daily-reports/ClassReportSection";

type Props = {
  report: DailyReportFull;
  lang: Lang;
};

function displayName(name: string, nameId: string | null, lang: Lang): string {
  if (lang === "id" && nameId) return nameId;
  return name;
}

const TILAWAH_METHOD_LABELS: Record<DailyReportTilawah['method'], string> = {
  quran: 'Quran',
  iqra: 'Iqra',
  ummi: 'Ummi',
  tilawati: 'Tilawati',
};

type TilawahSectionProps = { tilawah: DailyReportTilawah; lang: Lang };

function TilawahSection({ tilawah, lang }: TilawahSectionProps) {
  const methodOptions = (["quran", "iqra", "ummi", "tilawati"] as const).map((v) => ({
    value: v,
    label: TILAWAH_METHOD_LABELS[v],
  }));

  const labelKey = tilawah.ratingLabel?.toLowerCase();
  const labelOptions = [
    { value: "fluent", label: t(lang, "drTilawahFluent") },
    { value: "needs_guidance", label: t(lang, "drTilawahNeedsGuidance") },
    { value: "not_yet", label: t(lang, "drTilawahNotYet") },
  ];
  const normalizedLabel =
    labelKey === "fluent"
      ? "fluent"
      : labelKey === "needs guidance" || labelKey === "needs_guidance"
      ? "needs_guidance"
      : labelKey === "not yet" || labelKey === "not_yet"
      ? "not_yet"
      : labelKey ?? null;

  return (
    <ReportSectionShell
      title={t(lang, "drSectionTilawah")}
      icon="📖"
      headerClassName="bg-gradient-to-r from-teal-600 to-green-600"
    >
      <ReadOnlyPills
        label={t(lang, "drTilawahMethod")}
        options={methodOptions}
        selected={tilawah.method}
      />
      {tilawah.jilid != null ? (
        <ReadOnlyField label={t(lang, "drTilawahJilid")} value={String(tilawah.jilid)} />
      ) : null}
      {tilawah.page != null ? (
        <ReadOnlyField label={t(lang, "drTilawahPage")} value={String(tilawah.page)} />
      ) : null}
      <div>
        <FieldLabel>{t(lang, "drTilawahRating")}</FieldLabel>
        <StarRating rating={tilawah.rating} />
      </div>
      {normalizedLabel ? (
        <ReadOnlyPills
          label={t(lang, "drTilawahLabel")}
          options={labelOptions}
          selected={normalizedLabel}
        />
      ) : null}
    </ReportSectionShell>
  );
}

type MemorizeSectionProps = {
  memorize: DailyReportFull["memorize"];
  lang: Lang;
};

function MemorizeSection({ memorize, lang }: MemorizeSectionProps) {
  const labelOptions = [
    { value: "fluent", label: t(lang, "drTilawahFluent") },
    { value: "needs_guidance", label: t(lang, "drTilawahNeedsGuidance") },
    { value: "not_yet", label: t(lang, "drTilawahNotYet") },
  ];

  function normalizeLabel(raw: string | null): string | null {
    const key = raw?.toLowerCase();
    if (key === "fluent") return "fluent";
    if (key === "needs guidance" || key === "needs_guidance") return "needs_guidance";
    if (key === "not yet" || key === "not_yet") return "not_yet";
    return key ?? null;
  }

  return (
    <ReportSectionShell
      title={t(lang, "drSectionMemorize")}
      icon="🌙"
      headerClassName="bg-gradient-to-r from-purple-700 to-violet-600"
    >
      {memorize.length === 0 ? (
        <FieldCaption>{t(lang, "drMemorizeEmpty")}</FieldCaption>
      ) : (
        <ul className="space-y-4">
          {memorize.map((entry, i) => {
            const normalizedLabel = normalizeLabel(entry.ratingLabel);
            return (
              <li
                key={i}
                className="space-y-2 pb-4 border-b border-slate-100 last:border-0 last:pb-0"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[15px] font-semibold text-slate-900 leading-snug">
                    {entry.surahName}
                  </span>
                  {entry.verseNote ? (
                    <span className="text-[14px] text-slate-500 shrink-0">{entry.verseNote}</span>
                  ) : null}
                </div>
                <StarRating rating={entry.rating} />
                {normalizedLabel ? (
                  <ReadOnlyPills
                    options={labelOptions}
                    selected={normalizedLabel}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </ReportSectionShell>
  );
}

export function DailyReportReadView({ report, lang }: Props) {
  const dhuhaOptions = (["yes", "no"] as const).map((v) => ({
    value: v,
    label: t(lang, DHUHA_KEYS[v]),
  }));

  const zuhurOptions = (["well_done", "needs_guidance", "did_not_pray"] as const).map((v) => ({
    value: v,
    label: t(lang, ZUHUR_KEYS[v]),
  }));

  const lunchOptions = (["finished", "half", "refused"] as const).map((v) => ({
    value: v,
    label: t(lang, LUNCH_KEYS[v]),
  }));

  const waterOptions = (["good", "not_enough"] as const).map((v) => ({
    value: v,
    label: t(lang, WATER_KEYS[v]),
  }));

  const moodOptions = (["very_happy", "happy", "neutral", "sad", "fussy"] as const).map((v) => ({
    value: v,
    label: t(lang, MOOD_KEYS[v]),
    emoji: MOOD_EMOJI[v],
  }));

  const characterOptions = report.characters.map((c) => ({
    label: displayName(c.name, c.nameId, lang),
    selected: c.selected,
  }));

  const playCentreOptions = report.playCentres.map((pc) => ({
    label: displayName(pc.name, pc.nameId, lang),
    selected: pc.selected,
  }));

  return (
    <div className="space-y-4">
      {report.classReport ? (
        <ClassReportSection classReport={report.classReport} lang={lang} />
      ) : null}

      {characterOptions.length > 0 ? (
        <ReportSectionShell
          title={t(lang, "drSectionMuslimCharacter")}
          icon="⭐"
          subtitle={t(lang, "drMuslimCharacterHint")}
          headerClassName="bg-gradient-to-r from-indigo-600 to-violet-600"
        >
          <ReadOnlyMultiPills options={characterOptions} />
        </ReportSectionShell>
      ) : null}

      <ReportSectionShell
        title={t(lang, "drSectionDailyWorship")}
        icon="🕌"
        headerClassName="bg-gradient-to-r from-emerald-600 to-green-600"
      >
        <ReadOnlyField label={t(lang, "drFocusPrayer")} value={report.focusPrayer} />
        <div>
          <FieldLabel>{t(lang, "drRecitationRating")}</FieldLabel>
          <StarRating rating={report.focusPrayerRating} />
        </div>
        <ReadOnlyPills
          label={t(lang, "drDhuhaPrayer")}
          options={dhuhaOptions}
          selected={report.dhuhaPrayer}
        />
        <ReadOnlyPills
          label={t(lang, "drZuhurPrayer")}
          options={zuhurOptions}
          selected={report.zuhurPrayer}
        />
        <ReadOnlyField label={t(lang, "drSurahMemorised")} value={report.surahMemorised} />
        <ReadOnlyField label={t(lang, "drAsmaulHusna")} value={report.asmaulHusna} />
      </ReportSectionShell>

      {report.tilawah ? (
        <TilawahSection tilawah={report.tilawah} lang={lang} />
      ) : null}

      {report.memorize.length > 0 ? (
        <MemorizeSection memorize={report.memorize} lang={lang} />
      ) : null}

      {playCentreOptions.length > 0 || report.playCentreHighlights ? (
        <ReportSectionShell
          title={t(lang, "drSectionPlayCentre")}
          icon="🎨"
          headerClassName="bg-gradient-to-r from-violet-600 to-purple-600"
        >
          {playCentreOptions.length > 0 ? (
            <ReadOnlyPills
              label={t(lang, "drPlayCentreSelect")}
              options={playCentreOptions.map((pc) => ({
                value: pc.label,
                label: pc.label,
              }))}
              selected={playCentreOptions.find((pc) => pc.selected)?.label ?? null}
            />
          ) : null}
          <ReadOnlyField
            label={t(lang, "drActivityHighlights")}
            value={report.playCentreHighlights}
            multiline
          />
        </ReportSectionShell>
      ) : null}

      {report.learningAreas.length > 0 ? (
        <ReportSectionShell
          title={t(lang, "drSectionLearningAreas")}
          icon="📚"
          subtitle={t(lang, "drLearningAreasHint")}
          headerClassName="bg-gradient-to-r from-rose-500 to-pink-500"
        >
          <ReadOnlyLearningAreaList
            items={report.learningAreas}
            displayName={(name, nameId) => displayName(name, nameId, lang)}
          />
        </ReportSectionShell>
      ) : null}

      {report.vocabulary.length > 0 ? (
        <ReportSectionShell
          title={t(lang, "drSectionVocabulary")}
          icon="💬"
          subtitle={t(lang, "drVocabularySubtitle")}
          headerClassName="bg-gradient-to-r from-teal-500 to-cyan-500"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left">
                  <th className="pb-2 pr-4">
                    <FieldLabel>{t(lang, "drVocabWord")}</FieldLabel>
                  </th>
                  <th className="pb-2">
                    <FieldLabel>{t(lang, "drVocabMeaning")}</FieldLabel>
                  </th>
                </tr>
              </thead>
              <tbody>
                {report.vocabulary.map((v, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="py-2.5 pr-4 text-[15px] font-semibold text-slate-900">{v.word}</td>
                    <td className="py-2.5 text-[15px] font-normal text-slate-800">{v.meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ReportSectionShell>
      ) : null}

      <ReportSectionShell
        title={t(lang, "drSectionMeals")}
        icon="🍱"
        headerClassName="bg-gradient-to-r from-amber-500 to-orange-500"
      >
        <ReadOnlyPills label={t(lang, "drLunch")} options={lunchOptions} selected={report.lunchStatus} />
        <ReadOnlyPills
          label={t(lang, "drWaterIntake")}
          options={waterOptions}
          selected={report.waterIntake}
        />
        <ReadOnlyField label={t(lang, "drHealthNote")} value={report.healthNote} multiline />
      </ReportSectionShell>

      <ReportSectionShell
        title={t(lang, "drSectionMood")}
        icon="💙"
        headerClassName="bg-gradient-to-r from-blue-600 to-indigo-600"
      >
        <FieldCaption className="text-center mb-3">{t(lang, "drMoodQuestion")}</FieldCaption>
        <div className="grid grid-cols-5 gap-1.5">
          {moodOptions.map((m) => (
            <span
              key={m.value}
              className={[
                "flex flex-col items-center justify-center px-1 py-2 rounded-2xl border text-center min-w-0",
                report.mood === m.value
                  ? "bg-primary/10 border-primary text-primary"
                  : "bg-white border-slate-200 text-slate-400",
              ].join(" ")}
            >
              <span className="text-lg sm:text-xl leading-none" aria-hidden>
                {m.emoji}
              </span>
              <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-wide mt-1 leading-tight line-clamp-2">
                {m.label}
              </span>
            </span>
          ))}
        </div>
      </ReportSectionShell>

      {(report.teacherHighlight || report.teacherFollowup) ? (
        <ReportSectionShell
          title={t(lang, "drSectionTeacherNotes")}
          icon="📝"
          headerClassName="bg-gradient-to-r from-fuchsia-500 to-orange-400"
        >
          <ReadOnlyField
            label={t(lang, "drTeacherHighlight")}
            value={report.teacherHighlight}
            multiline
          />
          <ReadOnlyField
            label={t(lang, "drTeacherFollowup")}
            value={report.teacherFollowup}
            multiline
          />
        </ReportSectionShell>
      ) : null}
    </div>
  );
}
