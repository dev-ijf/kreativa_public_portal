'use client';

import { useState } from 'react';
import { ChevronDown, Download, Play } from 'lucide-react';
import type { Lang } from '@/lib/i18n/translations';
import { t } from '@/lib/i18n/translations';
import type {
  PortalLmsMaterial,
  PortalLmsPrePostBlock,
  PortalLmsSession,
} from '@/lib/portal/lms-weekly-plan-types';
import {
  htmlPlainLength,
  isPlayableVideoUrl,
  isVideoMaterialType,
  sanitizeSessionHtml,
  youtubeEmbedUrl,
} from '@/lib/portal/lms-weekly-plan-utils';
import { subjectColor } from '@/lib/portal/weekly-plan-colors';
import { formatTimeRange } from '@/lib/portal/weekly-plan-utils';

type Props = {
  lang: Lang;
  sessions: PortalLmsSession[];
  dayIndex: number;
};

const PRE_TYPE_LABELS: Record<string, { en: string; id: string }> = {
  video: { en: '🎬 Video / Lecture', id: '🎬 Video / Kuliah' },
  reading: { en: '📖 Reading', id: '📖 Bacaan' },
  worksheet: { en: '📄 Worksheet', id: '📄 Lembar kerja' },
  research: { en: '🔍 Research', id: '🔍 Riset' },
  podcast: { en: '🎧 Podcast / Audio', id: '🎧 Podcast / Audio' },
  other: { en: '📌 Other', id: '📌 Lainnya' },
};

const POST_TYPE_LABELS: Record<string, { en: string; id: string }> = {
  practice: { en: '✏️ Practice problems', id: '✏️ Latihan soal' },
  reflection: { en: '📝 Reflection writing', id: '📝 Refleksi' },
  research: { en: '🔍 Further research', id: '🔍 Riset lanjutan' },
  project: { en: '🛠️ Project work', id: '🛠️ Proyek' },
  self_quiz: { en: '✅ Self-quiz', id: '✅ Kuis mandiri' },
  other: { en: '📌 Other', id: '📌 Lainnya' },
};

function typeLabel(
  lang: Lang,
  type: string | null,
  map: Record<string, { en: string; id: string }>,
): string | null {
  if (!type) return null;
  const entry = map[type];
  if (!entry) return type;
  return lang === 'id' ? entry.id : entry.en;
}

function FieldCaption({
  label,
  accentClass,
}: {
  label: string;
  accentClass: string;
}) {
  return (
    <p
      className={`mb-0.5 text-[10.5px] font-bold uppercase tracking-wide ${accentClass}`}
    >
      {label}
    </p>
  );
}

function PrePostBlock({
  lang,
  titleKey,
  block,
  typeMap,
  variant,
}: {
  lang: Lang;
  titleKey: 'schedulePreLearning' | 'schedulePostLearning';
  block: PortalLmsPrePostBlock;
  typeMap: Record<string, { en: string; id: string }>;
  variant: 'pre' | 'post';
}) {
  const label = typeLabel(lang, block.type, typeMap);
  const url = block.url?.trim() || null;
  const fileHref = block.filePath?.trim() || null;
  const shell =
    variant === 'pre'
      ? 'mb-3 rounded-lg border border-amber-100 bg-amber-50/80 px-3 py-2.5'
      : 'mb-3 rounded-lg border border-emerald-100 bg-emerald-50/80 px-3 py-2.5';
  const titleClass =
    variant === 'pre' ? 'text-amber-800' : 'text-emerald-800';
  const captionClass =
    variant === 'pre' ? 'text-amber-700/80' : 'text-emerald-700/80';

  return (
    <div className={shell}>
      <p
        className={`mb-2.5 text-[11px] font-bold uppercase tracking-wide ${titleClass}`}
      >
        {t(lang, titleKey)}
      </p>

      <div className="grid grid-cols-2 gap-3">
        {label ? (
          <div>
            <FieldCaption
              label={t(lang, 'scheduleFieldType')}
              accentClass={captionClass}
            />
            <p className="mb-0 text-[13px] font-medium text-slate-800">{label}</p>
          </div>
        ) : null}
        {block.minutes != null ? (
          <div>
            <FieldCaption
              label={t(lang, 'scheduleFieldTime')}
              accentClass={captionClass}
            />
            <p className="mb-0 text-[13px] font-medium text-slate-800">
              {block.minutes} {t(lang, 'scheduleMinutes')}
            </p>
          </div>
        ) : null}
      </div>

      {block.instructions?.trim() ? (
        <div className="mt-2.5">
          <FieldCaption
            label={t(
              lang,
              variant === 'pre'
                ? 'scheduleFieldGuidingQuestion'
                : 'scheduleFieldInstructions',
            )}
            accentClass={captionClass}
          />
          <p className="mb-0 text-[13px] leading-relaxed text-slate-700 whitespace-pre-wrap">
            {block.instructions.trim()}
          </p>
        </div>
      ) : null}

      {url ? (
        <div className="mt-2.5">
          <FieldCaption
            label={t(lang, 'scheduleFieldLink')}
            accentClass={captionClass}
          />
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex break-all text-[12.5px] font-semibold text-sky-700"
          >
            {url}
          </a>
        </div>
      ) : null}

      {block.fileName || fileHref ? (
        <div className="mt-2.5">
          <FieldCaption
            label={t(lang, 'scheduleFieldFile')}
            accentClass={captionClass}
          />
          {fileHref ? (
            <a
              href={fileHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex text-[12.5px] font-semibold text-sky-700"
            >
              {block.fileName || t(lang, 'scheduleOpenLink')}
            </a>
          ) : (
            <p className="mb-0 text-[13px] font-medium text-slate-800">
              {block.fileName}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function SessionMaterials({
  lang,
  materials,
}: {
  lang: Lang;
  materials: PortalLmsMaterial[];
}) {
  const usable = materials.filter((m) => m.url);
  if (usable.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
        {t(lang, 'scheduleMaterials')}
      </p>
      <ul className="space-y-2">
        {usable.map((m) => {
          const url = m.url!;
          const isVideo = isVideoMaterialType(m.materialType);
          const yt = youtubeEmbedUrl(url);

          if (isVideo && yt) {
            return (
              <li key={m.id} className="space-y-1.5">
                <p className="text-[12.5px] font-medium text-slate-700">{m.title}</p>
                <div className="overflow-hidden rounded-xl bg-black aspect-video">
                  <iframe
                    src={yt}
                    title={m.title}
                    className="h-full w-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                </div>
              </li>
            );
          }

          if (isVideo && isPlayableVideoUrl(url)) {
            return (
              <li key={m.id} className="space-y-1.5">
                <p className="text-[12.5px] font-medium text-slate-700">{m.title}</p>
                <div className="overflow-hidden rounded-xl bg-black aspect-video">
                  <video
                    src={url}
                    controls
                    preload="metadata"
                    className="h-full w-full object-contain"
                    aria-label={m.title}
                  />
                </div>
              </li>
            );
          }

          if (isVideo) {
            return (
              <li key={m.id}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2.5 text-[12.5px] font-semibold text-slate-700"
                >
                  <Play size={14} strokeWidth={2.2} />
                  <span className="flex-1 truncate">{m.title}</span>
                  <span className="text-[11px] text-slate-500">
                    {t(lang, 'scheduleWatchVideo')}
                  </span>
                </a>
              </li>
            );
          }

          return (
            <li key={m.id}>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                download={m.fileName ?? undefined}
                className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2.5 text-[12.5px] font-semibold text-slate-700"
              >
                <Download size={14} strokeWidth={2.2} />
                <span className="flex-1 truncate">
                  {m.title || m.fileName || t(lang, 'scheduleDownloadFile')}
                </span>
                <span className="text-[11px] text-slate-500">
                  {t(lang, 'scheduleDownloadFile')}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SessionAccordion({
  lang,
  session,
  defaultOpen,
}: {
  lang: Lang;
  session: PortalLmsSession;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const colors = subjectColor(session.subjectName);
  const timeLabel =
    session.startTime && session.endTime
      ? formatTimeRange(session.startTime, session.endTime)
      : session.startTime || null;

  const safeHtml = session.descriptionHtml
    ? sanitizeSessionHtml(session.descriptionHtml)
    : '';
  const descLong = htmlPlainLength(safeHtml) > 180;
  const [descOpen, setDescOpen] = useState(!descLong);

  const hasBody =
    Boolean(session.learningObjectives?.trim()) ||
    Boolean(safeHtml) ||
    session.materials.some((m) => m.url) ||
    Boolean(session.preLearning?.enabled) ||
    Boolean(session.postLearning?.enabled);

  return (
    <li className="relative pb-0.5">
      <span
        className="absolute -left-5 top-3 h-[11px] w-[11px] rounded-full border-2 border-white"
        style={{ background: colors.fg }}
      />
      <div
        className="overflow-hidden rounded-xl"
        style={{ background: colors.bg }}
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-start gap-2 px-3 py-2.5 text-left"
          aria-expanded={open}
        >
          <div className="min-w-0 flex-1">
            {timeLabel ? (
              <p className="mb-1 text-[11px] font-semibold text-slate-500">
                {timeLabel}
              </p>
            ) : null}
            <span
              className="mb-1.5 inline-block rounded-full bg-white px-2.5 py-0.5 text-[11px] font-bold"
              style={{ color: colors.fg }}
            >
              {session.subjectName}
            </span>
            <div
              className="text-[13px] font-medium leading-snug"
              style={{ color: colors.fg }}
            >
              {session.title}
            </div>
          </div>
          {hasBody ? (
            <ChevronDown
              size={18}
              strokeWidth={2.2}
              className={`mt-1 shrink-0 text-slate-500 transition-transform ${
                open ? 'rotate-180' : ''
              }`}
              aria-hidden
            />
          ) : null}
        </button>

        {open && hasBody ? (
          <div className="border-t border-white/60 bg-white/70 px-3 py-3">
            {session.preLearning?.enabled ? (
              <PrePostBlock
                lang={lang}
                titleKey="schedulePreLearning"
                block={session.preLearning}
                typeMap={PRE_TYPE_LABELS}
                variant="pre"
              />
            ) : null}

            {session.learningObjectives?.trim() ? (
              <div className="mb-3">
                <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  {t(lang, 'scheduleLearningObjective')}
                </p>
                <p className="mb-0 text-[13px] leading-relaxed text-slate-700">
                  {session.learningObjectives.trim()}
                </p>
              </div>
            ) : null}

            {safeHtml ? (
              <div className="mb-1">
                {descLong ? (
                  <button
                    type="button"
                    onClick={() => setDescOpen((v) => !v)}
                    className="mb-1.5 text-[11px] font-semibold text-slate-500"
                  >
                    {descOpen
                      ? t(lang, 'scheduleHideDescription')
                      : t(lang, 'scheduleShowDescription')}
                  </button>
                ) : null}
                {descOpen || !descLong ? (
                  <div
                    className="lms-session-html text-[13px] leading-relaxed text-slate-600 [&_h2]:mb-2 [&_h2]:mt-0 [&_h2]:text-[15px] [&_h2]:font-semibold [&_h2]:text-slate-800 [&_h3]:mb-1.5 [&_h3]:mt-3 [&_h3]:text-[13.5px] [&_h3]:font-semibold [&_h3]:text-slate-800 [&_iframe]:my-2 [&_iframe]:aspect-video [&_iframe]:w-full [&_iframe]:max-w-full [&_iframe]:rounded-xl [&_li]:mb-0.5 [&_p]:mb-2 [&_p]:mt-0 [&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pl-5"
                    dangerouslySetInnerHTML={{ __html: safeHtml }}
                  />
                ) : (
                  <p className="mb-0 line-clamp-2 text-[13px] leading-relaxed text-slate-500">
                    {safeHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}
                  </p>
                )}
              </div>
            ) : null}

            <SessionMaterials lang={lang} materials={session.materials} />

            {session.postLearning?.enabled ? (
              <PrePostBlock
                lang={lang}
                titleKey="schedulePostLearning"
                block={session.postLearning}
                typeMap={POST_TYPE_LABELS}
                variant="post"
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </li>
  );
}

export function SecondaryWeeklyPlanView({ lang, sessions, dayIndex }: Props) {
  const daySessions = sessions
    .filter((s) => s.dayIndex === dayIndex)
    .sort((a, b) => {
      const ta = a.startTime ?? '';
      const tb = b.startTime ?? '';
      if (ta !== tb) return ta.localeCompare(tb);
      return a.id - b.id;
    });

  return (
    <div>
      <p className="mb-3 text-[13px] font-bold text-slate-800">
        {t(lang, 'scheduleDayScheduleTitle')}
      </p>
      {daySessions.length === 0 ? (
        <p className="text-sm text-slate-500">{t(lang, 'scheduleNoLmsSessions')}</p>
      ) : (
        <div className="relative pl-5">
          <div className="absolute left-[5px] top-1.5 bottom-1.5 w-[1.5px] bg-slate-200" />
          <ul className="space-y-3.5">
            {daySessions.map((session, i) => (
              <SessionAccordion
                key={session.id}
                lang={lang}
                session={session}
                defaultOpen={i === 0}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
