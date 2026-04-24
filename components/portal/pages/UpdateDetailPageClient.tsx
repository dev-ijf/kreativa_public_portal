"use client";

import Image from 'next/image';
import { Header } from '@/components/portal/Header';
import { usePortalState } from '@/components/portal/state/PortalProvider';
import type { PortalAnnouncementRow } from '@/lib/data/server/announcements';

type Props = {
  announcement: PortalAnnouncementRow;
};

export function UpdateDetailPageClient({ announcement }: Props) {
  const { lang } = usePortalState();
  const title = lang === 'en' ? announcement.titleEn : announcement.titleId;
  const html = lang === 'en' ? announcement.contentEn : announcement.contentId;
  const dateLabel = new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${announcement.publishDate}T12:00:00`));

  return (
    <div className="min-h-screen bg-slate-50 pb-6">
      <Header title={lang === 'en' ? 'Updates' : 'Info'} backHref="/updates" />
      <div className="px-4 mt-4">
        <article className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-100">
          {announcement.featuredImage ? (
            <div className="relative aspect-video w-full bg-slate-100">
              <Image
                src={announcement.featuredImage}
                alt={title}
                fill
                sizes="100vw"
                className="object-cover"
                priority
              />
            </div>
          ) : null}
          <div className="p-6">
            <span className="text-xs font-semibold text-slate-400 mb-3 block">{dateLabel}</span>
            <h2 className="font-bold text-slate-700 text-xl mb-4 leading-tight">{title}</h2>
            <div
              className="prose prose-slate max-w-none text-slate-600 text-sm leading-relaxed border-t border-slate-100 pt-4 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
        </article>
      </div>
    </div>
  );
}
