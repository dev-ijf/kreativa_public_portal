"use client";

import Image from "next/image";
import {
  DHUHA_KEYS,
  LUNCH_KEYS,
  MOOD_EMOJI,
  MOOD_KEYS,
  WATER_KEYS,
  ZUHUR_KEYS,
  type DailyReportFull,
  type DailyReportStudentMedia,
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
  VALUE_BADGE_SELECTED,
} from "@/components/portal/daily-reports/ReportSectionShell";
import { ClassReportSection } from "@/components/portal/daily-reports/ClassReportSection";
import { hasRichNoteContent } from "@/lib/portal/rich-note-html";

type Props = {
  report: DailyReportFull;
  lang: Lang;
};

function displayName(name: string, nameId: string | null, lang: Lang): string {
  if (lang === "id" && nameId) return nameId;
  return name;
}

const ATL_LABELS: Record<string, string> = {
  thinking: "Thinking",
  social: "Social",
  communication: "Communication",
  self_management: "Self-management",
  research: "Research",
};

function atlSkillLabel(skill: string): string {
  return ATL_LABELS[skill] ?? skill;
}

const TILAWAH_METHOD_LABELS: Record<DailyReportTilawah["method"], string> = {
  quran: "Quran",
  iqra: "Iqra",
  ummi: "Ummi",
  tilawati: "Tilawati",
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
          : (labelKey ?? null);

  return (
    <ReportSectionShell
      title={t(lang, "drSectionTilawah")}
      icon="📖"
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
                  <ReadOnlyPills options={labelOptions} selected={normalizedLabel} />
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </ReportSectionShell>
  );
}

function StudentMediaSection({
  media,
  lang,
}: {
  media: DailyReportStudentMedia[];
  lang: Lang;
}) {
  if (media.length === 0) return null;

  return (
    <ReportSectionShell
      title={t(lang, "drSectionStudentMedia")}
      icon="📷"
    >
      <div className="grid grid-cols-2 gap-2">
        {media.map((item) => {
          if (item.mediaType === "image") {
            return (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="relative block overflow-hidden rounded-xl bg-slate-100"
                style={{ aspectRatio: "1/1" }}
              >
                <Image
                  src={item.url}
                  alt={item.caption ?? ""}
                  fill
                  sizes="(max-width: 420px) 50vw, 210px"
                  className="object-cover"
                />
              </a>
            );
          }
          if (item.mediaType === "video_file") {
            return (
              <div
                key={item.id}
                className="col-span-2 rounded-xl overflow-hidden bg-black"
                style={{ aspectRatio: "16/9" }}
              >
                <video
                  src={item.url}
                  poster={item.thumbnailUrl ?? undefined}
                  controls
                  className="w-full h-full object-contain"
                  preload="metadata"
                />
              </div>
            );
          }
          return (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="col-span-2 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-primary"
            >
              {item.caption?.trim() || t(lang, "drStudentMediaOpen")}
            </a>
          );
        })}
      </div>
    </ReportSectionShell>
  );
}

function DailyWorshipSection({ report, lang }: Props) {
  const isPrimary = report.schoolLevel === "primary";
  const dhuhaOptions = (["yes", "no"] as const).map((v) => ({
    value: v,
    label: t(lang, DHUHA_KEYS[v]),
  }));
  const zuhurOptions = (["well_done", "needs_guidance", "did_not_pray"] as const).map((v) => ({
    value: v,
    label: t(lang, ZUHUR_KEYS[v]),
  }));

  const hasAny =
    report.focusPrayer ||
    report.focusPrayerRating != null ||
    report.dhuhaPrayer ||
    report.zuhurPrayer ||
    report.surahMemorised ||
    report.asmaulHusna;

  if (isPrimary && !hasAny) return null;

  return (
    <ReportSectionShell
      title={t(lang, "drSectionDailyWorship")}
      icon="🕌"
    >
      {(!isPrimary || report.focusPrayer) && (
        <ReadOnlyField label={t(lang, "drFocusPrayer")} value={report.focusPrayer} />
      )}
      {(!isPrimary || report.focusPrayerRating != null) && (
        <div>
          <FieldLabel>{t(lang, "drRecitationRating")}</FieldLabel>
          <StarRating rating={report.focusPrayerRating} />
        </div>
      )}
      {(!isPrimary || report.dhuhaPrayer) && (
        <ReadOnlyPills
          label={t(lang, "drDhuhaPrayer")}
          options={dhuhaOptions}
          selected={report.dhuhaPrayer}
        />
      )}
      {(!isPrimary || report.zuhurPrayer) && (
        <ReadOnlyPills
          label={t(lang, "drZuhurPrayer")}
          options={zuhurOptions}
          selected={report.zuhurPrayer}
        />
      )}
      {(!isPrimary || report.surahMemorised) && (
        <ReadOnlyField label={t(lang, "drSurahMemorised")} value={report.surahMemorised} />
      )}
      {(!isPrimary || report.asmaulHusna) && (
        <ReadOnlyField label={t(lang, "drAsmaulHusna")} value={report.asmaulHusna} />
      )}
    </ReportSectionShell>
  );
}

export function DailyReportReadView({ report, lang }: Props) {
  const isPrimary = report.schoolLevel === "primary";

  // Class report published without a per-student report: show it on its own,
  // no empty per-student sections.
  if (report.classReportOnly) {
    return report.classReport ? (
      <ClassReportSection classReport={report.classReport} lang={lang} />
    ) : null;
  }

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

  const selectedLearningAreas = report.learningAreas.filter((la) => la.selected || la.rating != null);

  // KG stores Toilet as an observe domain (ERP showToiletSection); Primary uses full Observations.
  const toiletDomain = !isPrimary
    ? report.observeDomains.find(
        (d) => /toilet/i.test(d.name) || (d.nameId != null && /toilet/i.test(d.nameId)),
      )
    : undefined;
  const toiletOptions =
    toiletDomain?.options
      .filter((o) => o.selected)
      .map((o) => ({
        label: displayName(o.name, o.nameId, lang),
        selected: true as const,
      })) ?? [];

  // Mobile: stacked. Desktop: CSS columns (masonry) so short cards fill gaps
  // instead of aligning to the tallest card in the same grid row.
  return (
    <div className="space-y-4 md:space-y-0 md:columns-2 md:gap-4">
      {report.classReport ? (
        <ClassReportSection classReport={report.classReport} lang={lang} />
      ) : null}

      {characterOptions.some((c) => c.selected) || (!isPrimary && characterOptions.length > 0) ? (
        <ReportSectionShell
          title={t(lang, "drSectionMuslimCharacter")}
          icon="⭐"
          subtitle={t(lang, "drMuslimCharacterHint")}
        >
          <ReadOnlyMultiPills
            options={
              isPrimary
                ? characterOptions.filter((c) => c.selected)
                : characterOptions
            }
          />
        </ReportSectionShell>
      ) : null}

      <DailyWorshipSection report={report} lang={lang} />

      {report.tilawah ? <TilawahSection tilawah={report.tilawah} lang={lang} /> : null}

      {report.memorize.length > 0 ? (
        <MemorizeSection memorize={report.memorize} lang={lang} />
      ) : null}

      {!isPrimary &&
      (playCentreOptions.length > 0 || hasRichNoteContent(report.playCentreHighlights)) ? (
        <ReportSectionShell
          title={t(lang, "drSectionPlayCentre")}
          icon="🎨"
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
            html
          />
        </ReportSectionShell>
      ) : null}

      {isPrimary && report.subjects.length > 0 ? (
        <ReportSectionShell
          title={t(lang, "drSectionSubjects")}
          icon="📘"
          subtitle={t(lang, "drSubjectsHint")}
        >
          <ul className="space-y-4">
            {report.subjects.map((s, i) => {
              const subjectLabel = displayName(s.subjectName, s.subjectNameId, lang);
              const atlLabels = s.atlSkills.map(atlSkillLabel);
              const noteValue = s.noteToParents || s.teacherNote;
              return (
                <li
                  key={i}
                  className="space-y-2 pb-4 border-b border-slate-100 last:border-0 last:pb-0"
                >
                  <p className="text-[15px] font-bold text-slate-900">{subjectLabel}</p>
                  <ReadOnlyField label={t(lang, "drSubjectTopic")} value={s.topic} />
                  <ReadOnlyField
                    label={t(lang, "drSubjectActivities")}
                    value={s.activities}
                    multiline
                  />
                  {s.dailyScore != null || s.scoreLabel ? (
                    <ReadOnlyField
                      label={t(lang, "drSubjectScore")}
                      value={
                        [s.dailyScore != null ? String(s.dailyScore) : null, s.scoreLabel]
                          .filter(Boolean)
                          .join(" · ") || null
                      }
                    />
                  ) : null}
                  {s.homeworkGiven || s.homework ? (
                    <>
                      <ReadOnlyField
                        label={t(lang, "drSubjectHomework")}
                        value={s.homework}
                        multiline
                      />
                      {s.homeworkDueDate ? (
                        <ReadOnlyField
                          label={t(lang, "drSubjectHomeworkDue")}
                          value={s.homeworkDueDate}
                        />
                      ) : null}
                    </>
                  ) : null}
                  {atlLabels.length > 0 ? (
                    <div>
                      <FieldLabel>{t(lang, "drSubjectAtl")}</FieldLabel>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {atlLabels.map((label) => (
                          <span
                            key={label}
                            className={`rounded-full px-2.5 py-0.5 text-xs border ${VALUE_BADGE_SELECTED}`}
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {s.characters.length > 0 ? (
                    <div>
                      <FieldLabel>{t(lang, "drSubjectCharacters")}</FieldLabel>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {s.characters.map((c) => (
                          <span
                            key={c}
                            className={`rounded-full px-2.5 py-0.5 text-xs border ${VALUE_BADGE_SELECTED}`}
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <ReadOnlyField label={t(lang, "drSubjectNote")} value={noteValue} multiline />
                  {s.privateNote ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-amber-800 mb-1">
                        {t(lang, "drSubjectPrivateNote").replace("{name}", report.studentName)}
                      </p>
                      <p className="text-sm text-amber-950 whitespace-pre-wrap">{s.privateNote}</p>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </ReportSectionShell>
      ) : null}

      {selectedLearningAreas.length > 0 ? (
        <ReportSectionShell
          title={t(lang, "drSectionLearningAreas")}
          icon="📚"
          subtitle={t(lang, "drLearningAreasHint")}
        >
          <ReadOnlyLearningAreaList
            items={selectedLearningAreas}
            displayName={(name, nameId) => displayName(name, nameId, lang)}
          />
        </ReportSectionShell>
      ) : null}

      {report.vocabulary.length > 0 ? (
        <ReportSectionShell
          title={t(lang, "drSectionVocabulary")}
          icon="💬"
          subtitle={t(lang, "drVocabularySubtitle")}
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

      {isPrimary && report.observeDomains.some((d) => d.options.some((o) => o.selected)) ? (
        <ReportSectionShell
          title={t(lang, "drSectionObservations")}
          icon="👁"
          subtitle={t(lang, "drObservationsHint")}
        >
          <ul className="space-y-5">
            {report.observeDomains
              .filter((d) => d.options.some((o) => o.selected))
              .map((domain) => (
                <li key={domain.name} className="space-y-2">
                  <FieldLabel>
                    {displayName(domain.name, domain.nameId, lang)}
                  </FieldLabel>
                  <ReadOnlyMultiPills
                    options={domain.options
                      .filter((o) => o.selected)
                      .map((o) => ({
                        label: displayName(o.name, o.nameId, lang),
                        selected: true,
                      }))}
                  />
                </li>
              ))}
          </ul>
        </ReportSectionShell>
      ) : null}

      {!isPrimary && toiletOptions.length > 0 ? (
        <ReportSectionShell
          title={
            toiletDomain
              ? displayName(toiletDomain.name, toiletDomain.nameId, lang)
              : t(lang, "drSectionToilet")
          }
          icon="🚽"
          subtitle={t(lang, "drToiletHint")}
        >
          <ReadOnlyMultiPills options={toiletOptions} />
        </ReportSectionShell>
      ) : null}

      {!isPrimary ? (
        <ReportSectionShell
          title={t(lang, "drSectionMeals")}
          icon="🍱"
        >
          <ReadOnlyPills
            label={t(lang, "drLunch")}
            options={lunchOptions}
            selected={report.lunchStatus}
          />
          <ReadOnlyPills
            label={t(lang, "drWaterIntake")}
            options={waterOptions}
            selected={report.waterIntake}
          />
          <ReadOnlyField label={t(lang, "drHealthNote")} value={report.healthNote} multiline />
        </ReportSectionShell>
      ) : null}

      {report.schoolLevel === "kindergarten" &&
      (report.sleepTime || report.wakeTime || report.readingTogether) ? (
        <ReportSectionShell
          title={t(lang, "drSectionHomeRoutine")}
          icon="🏠"
        >
          <div className="grid grid-cols-2 gap-3">
            <ReadOnlyField label={t(lang, "drSleepTime")} value={report.sleepTime} />
            <ReadOnlyField label={t(lang, "drWakeTime")} value={report.wakeTime} />
          </div>
          <ReadOnlyPills
            label={t(lang, "drReadingTogether")}
            options={[
              { value: "yes", label: lang === "id" ? "Ya" : "Yes" },
              { value: "no", label: lang === "id" ? "Tidak" : "No" },
            ]}
            selected={report.readingTogether ? "yes" : "no"}
          />
        </ReportSectionShell>
      ) : null}

      {!isPrimary ? (
        <ReportSectionShell
          title={t(lang, "drSectionMood")}
          icon="💙"
        >
          <FieldCaption className="text-center mb-3">{t(lang, "drMoodQuestion")}</FieldCaption>
          <div className="grid grid-cols-5 gap-1.5">
            {moodOptions.map((m) => (
              <span
                key={m.value}
                className={[
                  "flex flex-col items-center justify-center px-1 py-2 rounded-2xl border text-center min-w-0",
                  report.mood === m.value
                    ? "bg-primary/10 border-primary/40 text-primary"
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
      ) : null}

      {isPrimary &&
      (report.shineMoment || report.teacherNarrative || report.homeGuidance) ? (
        <ReportSectionShell
          title={t(lang, "drSectionNarrative")}
          icon="✨"
        >
          <ReadOnlyField
            label={t(lang, "drShineMoment")}
            value={report.shineMoment}
            multiline
          />
          <ReadOnlyField
            label={t(lang, "drTeacherNarrative")}
            value={report.teacherNarrative}
            multiline
          />
          <ReadOnlyField
            label={t(lang, "drHomeGuidance")}
            value={report.homeGuidance}
            multiline
          />
        </ReportSectionShell>
      ) : null}

      {isPrimary && report.homeTips.length > 0 ? (
        <ReportSectionShell
          title={t(lang, "drSectionHomeTips")}
          icon="🏠"
          subtitle={t(lang, "drHomeTipsHint")}
        >
          <ul className="space-y-2">
            {report.homeTips.map((tip, i) => (
              <li
                key={i}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[14px] text-slate-800"
              >
                {displayName(tip.name, tip.nameId, lang)}
              </li>
            ))}
          </ul>
        </ReportSectionShell>
      ) : null}

      {isPrimary ? <StudentMediaSection media={report.studentMedia} lang={lang} /> : null}

      {hasRichNoteContent(report.teacherHighlight) ||
      hasRichNoteContent(report.teacherFollowup) ? (
        <ReportSectionShell
          title={t(lang, "drSectionTeacherNotes")}
          icon="📝"
        >
          <ReadOnlyField
            label={t(lang, "drTeacherHighlight")}
            value={report.teacherHighlight}
            multiline
            html
          />
          <ReadOnlyField
            label={t(lang, "drTeacherFollowup")}
            value={report.teacherFollowup}
            multiline
            html
          />
        </ReportSectionShell>
      ) : null}
    </div>
  );
}
