'use client';

import { Fragment } from 'react';
import { BlockMath, InlineMath } from 'react-katex';
import { parseLatexSegments } from '@/lib/utils/parse-latex-segments';

export type LatexTextProps = {
  /** Teks dari AI / API; prioritas di atas `children`. */
  text?: string;
  /** Alternatif: string sebagai children (hanya jika bertipe string). */
  children?: string;
  className?: string;
};

function renderErrorFallback(latex: string) {
  return (
    <span className="rounded bg-amber-50 px-1 font-mono text-xs text-amber-900" title="LaTeX tidak valid">
      {latex}
    </span>
  );
}

export function LatexText({ text, children, className = '' }: LatexTextProps) {
  const raw = text ?? children ?? '';
  const segments = parseLatexSegments(raw);

  if (segments.length === 0) {
    return null;
  }

  return (
    <span className={className}>
      {segments.map((seg, idx) => {
        const key = `${idx}-${seg.type}-${seg.value.slice(0, 24)}`;
        if (seg.type === 'text') {
          return (
            <Fragment key={key}>
              {seg.value.split('\n').map((line, j, arr) => (
                <Fragment key={`${key}-l${j}`}>
                  {line}
                  {j < arr.length - 1 ? <br /> : null}
                </Fragment>
              ))}
            </Fragment>
          );
        }
        if (seg.type === 'block') {
          return (
            <span key={key} className="my-2 block w-full [&_.katex-display]:my-2">
              <BlockMath math={seg.value} renderError={() => renderErrorFallback(seg.value)} />
            </span>
          );
        }
        return (
          <InlineMath key={key} math={seg.value} renderError={() => renderErrorFallback(seg.value)} />
        );
      })}
    </span>
  );
}
