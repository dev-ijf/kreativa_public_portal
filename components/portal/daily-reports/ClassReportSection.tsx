"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { ClassReportInfo, ClassReportMedia } from "@/lib/portal/daily-reports-shared";
import { t, type Lang } from "@/lib/i18n/translations";
import { FieldCaption, FieldLabel, ReportSectionShell } from "./ReportSectionShell";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Props = {
  classReport: ClassReportInfo;
  lang: Lang;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns the image-only items for the lightbox. */
function imageItems(media: ClassReportMedia[]) {
  return media.filter((m) => m.mediaType === "image");
}

/** Clamps the displayed collage to 4 cells maximum. */
const MAX_CELLS = 4;

// ---------------------------------------------------------------------------
// Individual media cell renderers
// ---------------------------------------------------------------------------

function ImageCell({
  item,
  onClick,
  fill = false,
}: {
  item: ClassReportMedia;
  onClick: () => void;
  fill?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative w-full overflow-hidden rounded-xl bg-slate-100 block"
      style={fill ? { aspectRatio: "16/9" } : { aspectRatio: "1/1" }}
      aria-label={item.caption ?? "View image"}
    >
      <Image
        src={item.url}
        alt={item.caption ?? ""}
        fill
        sizes="(max-width: 420px) 50vw, 210px"
        className="object-cover"
      />
    </button>
  );
}

function VideoFileCell({ item }: { item: ClassReportMedia }) {
  return (
    <div className="rounded-xl overflow-hidden bg-black" style={{ aspectRatio: "16/9" }}>
      <video
        src={item.url}
        poster={item.thumbnailUrl ?? undefined}
        controls
        className="w-full h-full object-contain"
        aria-label={item.caption ?? "Video"}
        preload="metadata"
      />
    </div>
  );
}

function VideoLinkCell({ item }: { item: ClassReportMedia }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="relative w-full overflow-hidden rounded-xl bg-slate-900 flex items-center justify-center block"
      style={{ aspectRatio: "16/9" }}
      aria-label={item.caption ?? "Watch video"}
    >
      {item.thumbnailUrl ? (
        <Image
          src={item.thumbnailUrl}
          alt={item.caption ?? ""}
          fill
          sizes="(max-width: 420px) 100vw, 420px"
          className="object-cover opacity-60"
        />
      ) : null}
      <span className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow-lg">
        <svg viewBox="0 0 24 24" className="h-6 w-6 fill-slate-900 ml-1" aria-hidden>
          <path d="M8 5v14l11-7z" />
        </svg>
      </span>
    </a>
  );
}

/** Overlay cell showing "+N more" over a blurred thumbnail. */
function MoreOverlayCell({
  item,
  remaining,
  onClick,
}: {
  item: ClassReportMedia;
  remaining: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative w-full overflow-hidden rounded-xl bg-slate-900"
      style={{ aspectRatio: "1/1" }}
      aria-label={`Show ${remaining} more`}
    >
      {item.mediaType === "image" ? (
        <Image
          src={item.url}
          alt=""
          fill
          sizes="(max-width: 420px) 50vw, 210px"
          className="object-cover opacity-40"
        />
      ) : null}
      <span className="absolute inset-0 flex items-center justify-center text-white font-black text-2xl drop-shadow">
        +{remaining}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Collage grid
// ---------------------------------------------------------------------------

function CollageGrid({
  media,
  onImageClick,
}: {
  media: ClassReportMedia[];
  onImageClick: (imageIndex: number) => void;
}) {
  const total = media.length;
  const displayed = media.slice(0, MAX_CELLS);
  const remaining = total - MAX_CELLS; // may be 0 or negative

  /** Map a media item to its image-list index (for lightbox). */
  const toImageIndex = (item: ClassReportMedia) =>
    imageItems(media).findIndex((m) => m.id === item.id);

  // ── 1 item ─────────────────────────────────────────────────────────────
  if (total === 1) {
    const item = media[0];
    if (item.mediaType === "video_file") return <VideoFileCell item={item} />;
    if (item.mediaType === "video_link") return <VideoLinkCell item={item} />;
    return (
      <ImageCell item={item} fill onClick={() => onImageClick(toImageIndex(item))} />
    );
  }

  // ── 2 items ────────────────────────────────────────────────────────────
  if (total === 2) {
    return (
      <div className="grid grid-cols-2 gap-1.5">
        {media.map((item) => renderCell(item, false, toImageIndex, onImageClick, 0))}
      </div>
    );
  }

  // ── 3 items ────────────────────────────────────────────────────────────
  if (total === 3) {
    const [first, ...rest] = media;
    return (
      <div className="space-y-1.5">
        <ImageCell
          item={first}
          fill
          onClick={() => onImageClick(toImageIndex(first))}
        />
        <div className="grid grid-cols-2 gap-1.5">
          {rest.map((item) => renderCell(item, false, toImageIndex, onImageClick, 0))}
        </div>
      </div>
    );
  }

  // ── 4+ items: 2×2 grid, last cell may be "+N more" ────────────────────
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {displayed.map((item, idx) => {
        const isLastCell = idx === MAX_CELLS - 1 && remaining > 0;
        if (isLastCell) {
          return (
            <MoreOverlayCell
              key={item.id}
              item={item}
              remaining={remaining + 1}
              onClick={() => {
                if (item.mediaType === "image") onImageClick(toImageIndex(item));
              }}
            />
          );
        }
        return renderCell(item, false, toImageIndex, onImageClick, 0, String(item.id));
      })}
    </div>
  );
}

function renderCell(
  item: ClassReportMedia,
  fill: boolean,
  toImageIndex: (item: ClassReportMedia) => number,
  onImageClick: (idx: number) => void,
  _unused: number,
  key?: string,
) {
  if (item.mediaType === "video_file") return <VideoFileCell key={key ?? item.id} item={item} />;
  if (item.mediaType === "video_link") return <VideoLinkCell key={key ?? item.id} item={item} />;
  return (
    <ImageCell
      key={key ?? item.id}
      item={item}
      fill={fill}
      onClick={() => onImageClick(toImageIndex(item))}
    />
  );
}

// ---------------------------------------------------------------------------
// Lightbox (images only)
// ---------------------------------------------------------------------------

function Lightbox({
  images,
  startIndex,
  onClose,
}: {
  images: ClassReportMedia[];
  startIndex: number;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState(startIndex);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setCurrent((c) => Math.max(0, c - 1));
      if (e.key === "ArrowRight") setCurrent((c) => Math.min(images.length - 1, c + 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [images.length, onClose]);

  const item = images[current];
  if (!item) return null;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
    if (dx < -50) setCurrent((c) => Math.min(images.length - 1, c + 1));
    if (dx > 50) setCurrent((c) => Math.max(0, c - 1));
    touchStartX.current = null;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      role="dialog"
      aria-modal
      aria-label="Image viewer"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <span className="text-white/60 text-sm font-medium">
          {current + 1} / {images.length}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-white p-2 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Close"
        >
          <svg viewBox="0 0 24 24" className="w-6 h-6 fill-none stroke-current stroke-2" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Image area */}
      <div className="relative flex-1 min-h-0 flex items-center justify-center px-2">
        {/* Prev button */}
        {current > 0 && (
          <button
            type="button"
            onClick={() => setCurrent((c) => c - 1)}
            className="absolute left-2 z-10 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
            aria-label="Previous"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current stroke-2" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        <div className="relative w-full h-full">
          <Image
            key={item.id}
            src={item.url}
            alt={item.caption ?? ""}
            fill
            sizes="100vw"
            className="object-contain"
            priority
          />
        </div>

        {/* Next button */}
        {current < images.length - 1 && (
          <button
            type="button"
            onClick={() => setCurrent((c) => c + 1)}
            className="absolute right-2 z-10 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
            aria-label="Next"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current stroke-2" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      {/* Caption */}
      {item.caption ? (
        <div className="shrink-0 px-5 py-3 text-center">
          <p className="text-white/90 text-sm leading-relaxed">{item.caption}</p>
        </div>
      ) : (
        <div className="shrink-0 h-4" />
      )}

      {/* Dot indicators */}
      {images.length > 1 && (
        <div className="shrink-0 flex justify-center gap-1.5 pb-6">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setCurrent(i)}
              className={[
                "w-1.5 h-1.5 rounded-full transition-all",
                i === current ? "bg-white scale-125" : "bg-white/40",
              ].join(" ")}
              aria-label={`Go to image ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ClassReportSection({ classReport, lang }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const { theme, teacherNote, media } = classReport;
  const imgs = imageItems(media);

  const hasContent = theme || teacherNote || media.length > 0;
  if (!hasContent) return null;

  return (
    <>
      <ReportSectionShell
        title={t(lang, "drSectionClassActivity")}
        icon="📸"
        headerClassName="bg-gradient-to-r from-sky-500 to-blue-600"
      >
        {/* Theme chip */}
        {theme ? (
          <div>
            <FieldLabel>{t(lang, "drClassTheme")}</FieldLabel>
            <span className="inline-block bg-sky-50 text-sky-700 border border-sky-200 rounded-full px-3 py-1 text-sm font-semibold">
              {theme}
            </span>
          </div>
        ) : null}

        {/* Class teacher note */}
        {teacherNote ? (
          <div>
            <FieldLabel>{t(lang, "drClassTeacherNote")}</FieldLabel>
            <FieldCaption>{teacherNote}</FieldCaption>
          </div>
        ) : null}

        {/* Media collage */}
        {media.length > 0 ? (
          <div>
            <FieldLabel>{t(lang, "drClassMediaTitle")}</FieldLabel>
            <CollageGrid
              media={media}
              onImageClick={(idx) => setLightboxIndex(idx)}
            />

            {/* Caption strip for single-item or visible items */}
            {media.length <= MAX_CELLS ? (
              <ul className="mt-2 space-y-1">
                {media
                  .filter((m) => m.caption)
                  .map((m) => (
                    <li key={m.id} className="text-xs text-slate-500 leading-snug">
                      <span className="font-semibold text-slate-600">#</span> {m.caption}
                    </li>
                  ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </ReportSectionShell>

      {/* Lightbox portal */}
      {lightboxIndex !== null && imgs.length > 0 ? (
        <Lightbox
          images={imgs}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      ) : null}
    </>
  );
}
