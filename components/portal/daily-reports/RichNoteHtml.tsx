"use client";

import {
  htmlPlainLength,
  looksLikeHtml,
  sanitizeRichNoteHtml,
} from "@/lib/portal/rich-note-html";

type Props = {
  value: string | null | undefined;
  /** Slightly smaller muted style (class note caption) */
  muted?: boolean;
  className?: string;
};

/**
 * Renders teacher notes: TipTap HTML (sanitized) or legacy plain text.
 */
export function RichNoteHtml({ value, muted = false, className = "" }: Props) {
  if (value == null) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  if (looksLikeHtml(raw)) {
    const safe = sanitizeRichNoteHtml(raw);
    if (!safe || htmlPlainLength(safe) === 0) return null;
    return (
      <div
        className={[
          muted
            ? "text-xs text-slate-500 leading-relaxed"
            : "text-[15px] text-slate-800 leading-relaxed",
          "[&_p]:my-1.5 [&_ul]:my-1.5 [&_ol]:my-1.5 [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5 [&_li]:my-0.5",
          "[&_strong]:font-semibold [&_b]:font-semibold [&_em]:italic [&_i]:italic [&_u]:underline [&_s]:line-through",
          "[&_h1]:text-base [&_h1]:font-bold [&_h2]:text-[15px] [&_h2]:font-bold [&_h3]:text-sm [&_h3]:font-semibold",
          "[&_a]:text-primary [&_a]:underline [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-2",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        dangerouslySetInnerHTML={{ __html: safe }}
      />
    );
  }

  return (
    <p
      className={[
        muted
          ? "text-xs font-normal text-slate-500 leading-relaxed whitespace-pre-wrap"
          : "text-[15px] font-normal text-slate-800 leading-relaxed whitespace-pre-wrap",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {raw}
    </p>
  );
}
