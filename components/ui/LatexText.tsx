'use client';

import { Fragment, type ReactNode } from 'react';
import { BlockMath, InlineMath } from 'react-katex';
import { parseLatexSegments, type LatexSegment } from '@/lib/utils/parse-latex-segments';

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

type StyledChunk = { content: string; bold: boolean; italic: boolean };

/**
 * Split input by markdown **bold** markers into chunks,
 * preserving content that may contain LaTeX inside bold spans.
 * Single * is treated as bullet/list marker (not italic) to avoid false positives.
 */
function splitMarkdownChunks(input: string): StyledChunk[] {
  const chunks: StyledChunk[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(input)) !== null) {
    if (match.index > lastIndex) {
      chunks.push({ content: input.slice(lastIndex, match.index), bold: false, italic: false });
    }
    chunks.push({ content: match[1], bold: true, italic: false });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < input.length) {
    chunks.push({ content: input.slice(lastIndex), bold: false, italic: false });
  }

  return chunks;
}

function renderSegments(segments: LatexSegment[], keyPrefix: string): ReactNode[] {
  return segments.map((seg, idx) => {
    const key = `${keyPrefix}-${idx}-${seg.type}`;
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
  });
}

export function LatexText({ text, children, className = '' }: LatexTextProps) {
  const raw = text ?? children ?? '';

  if (!raw) return null;

  const chunks = splitMarkdownChunks(raw);

  return (
    <span className={className}>
      {chunks.map((chunk, ci) => {
        const segments = parseLatexSegments(chunk.content);
        const rendered = renderSegments(segments, `c${ci}`);

        if (chunk.bold) {
          return <strong key={`chunk-${ci}`}>{rendered}</strong>;
        }
        if (chunk.italic) {
          return <em key={`chunk-${ci}`}>{rendered}</em>;
        }
        return <Fragment key={`chunk-${ci}`}>{rendered}</Fragment>;
      })}
    </span>
  );
}
