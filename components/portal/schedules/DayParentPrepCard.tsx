'use client';

import type { Lang } from '@/lib/i18n/translations';
import { t } from '@/lib/i18n/translations';
import type { PortalDayNote } from '@/lib/portal/weekly-plan-types';

export function DayParentPrepCard({
  lang,
  note,
}: {
  lang: Lang;
  note: PortalDayNote | null | undefined;
}) {
  const uniform = note?.uniformLabel?.trim() || '';
  const prep = note?.parentPrep?.trim() || '';
  if (!uniform && !prep) return null;

  return (
    <div className="rounded-[20px] border border-amber-200 bg-amber-50 p-[18px] space-y-2">
      {uniform ? (
        <p className="m-0 text-[13.5px] text-amber-950">
          <span className="font-bold">{t(lang, 'scheduleUniformLabel')}:</span> {uniform}
        </p>
      ) : null}
      {prep ? (
        <div>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-amber-800/70">
            {t(lang, 'scheduleParentPrepTitle')}
          </p>
          <p className="m-0 text-[13.5px] leading-relaxed text-amber-950 whitespace-pre-wrap">
            {prep}
          </p>
        </div>
      ) : null}
    </div>
  );
}
