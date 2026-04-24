"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Header } from '@/components/portal/Header';
import { usePortalState } from '@/components/portal/state/PortalProvider';
import type { AnnouncementPageCursor, PortalAnnouncementRow } from '@/lib/data/server/announcements';

function stripTagsForExcerpt(html: string, maxLen: number): string {
  const plain = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (plain.length <= maxLen) return plain;
  return `${plain.slice(0, maxLen).trim()}…`;
}

type Props = {
  initialRows: PortalAnnouncementRow[];
  initialNextCursor: AnnouncementPageCursor | null;
};

export function UpdatesPageClient({ initialRows, initialNextCursor }: Props) {
  const { lang } = usePortalState();
  const [items, setItems] = useState<PortalAnnouncementRow[]>(initialRows);
  const [nextCursor, setNextCursor] = useState<AnnouncementPageCursor | null>(initialNextCursor);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loading) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        cursorPublishDate: nextCursor.publishDate,
        cursorId: nextCursor.id,
      });
      const res = await fetch(`/api/portal/announcements?${params.toString()}`);
      if (!res.ok) return;
      const data = (await res.json()) as {
        rows: PortalAnnouncementRow[];
        nextCursor: AnnouncementPageCursor | null;
      };
      setItems((prev) => [...prev, ...data.rows]);
      setNextCursor(data.nextCursor);
    } finally {
      setLoading(false);
    }
  }, [nextCursor, loading]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !nextCursor) return;

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: '120px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [nextCursor, loadMore]);

  return (
    <div className="min-h-screen bg-slate-50 pb-6">
      <Header title={lang === 'en' ? 'Updates' : 'Info'} backHref="/" />
      <div className="px-4 mt-2 space-y-4">
        <h3 className="font-bold text-slate-700 mb-2">
          {lang === 'en' ? 'School Announcements' : 'Pengumuman Sekolah'}
        </h3>
        {items.length === 0 ? (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 text-sm text-slate-600">
            {lang === 'en' ? 'No announcements yet.' : 'Belum ada pengumuman.'}
          </div>
        ) : (
          items.map((update) => {
            const title = lang === 'en' ? update.titleEn : update.titleId;
            const rawHtml = lang === 'en' ? update.contentEn : update.contentId;
            const excerpt = stripTagsForExcerpt(rawHtml, 160);
            const dateLabel = new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'id-ID', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            }).format(new Date(`${update.publishDate}T12:00:00`));

            return (
              <article
                key={update.id}
                className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-100"
              >
                {update.featuredImage ? (
                  <Link href={`/updates/${update.id}`} className="block relative aspect-video w-full bg-slate-100">
                    <Image
                      src={update.featuredImage}
                      alt={title}
                      fill
                      sizes="(max-width: 768px) 100vw, 480px"
                      className="object-cover"
                    />
                  </Link>
                ) : null}
                <div className="p-5">
                  <span className="text-xs text-slate-400 mb-2 block">{dateLabel}</span>
                  <h4 className="font-bold text-slate-700 text-lg mb-2 leading-tight">
                    <Link href={`/updates/${update.id}`} className="hover:text-primary transition-colors">
                      {title}
                    </Link>
                  </h4>
                  <p className="text-slate-600 text-sm mb-4 leading-relaxed line-clamp-3">{excerpt}</p>
                  <Link href={`/updates/${update.id}`} className="text-primary font-bold text-sm hover:underline">
                    {lang === 'en' ? 'Read More' : 'Baca Selengkapnya'}
                  </Link>
                </div>
              </article>
            );
          })
        )}
        {nextCursor ? <div ref={sentinelRef} className="h-4 w-full" aria-hidden /> : null}
        {loading ? (
          <p className="text-center text-sm text-slate-500 py-2">
            {lang === 'en' ? 'Loading…' : 'Memuat…'}
          </p>
        ) : null}
      </div>
    </div>
  );
}
