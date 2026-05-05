'use client';

import { parseRichSegments, type RichSegment } from '@/lib/utils/parse-rich-segments';
import { LatexText } from '@/components/ui/LatexText';
import { MathPlot } from '@/components/ui/MathPlot';
import { MermaidDiagram } from '@/components/ui/MermaidDiagram';

export type RichTextProps = {
  text?: string;
  children?: string;
  className?: string;
};

/**
 * Convert literal two-char `\n` / `\t` sequences (from DB text) into real
 * newline/tab characters, but ONLY outside LaTeX delimiters ($...$ and $$...$$).
 * Inside LaTeX, `\n` could be part of commands like \nu, \newcommand, etc.
 */
function normalizeLiteralEscapes(s: string): string {
  const result: string[] = [];
  let i = 0;
  const n = s.length;

  while (i < n) {
    // Enter block math $$
    if (s[i] === '$' && s[i + 1] === '$') {
      const start = i;
      i += 2;
      while (i < n - 1 && !(s[i] === '$' && s[i + 1] === '$')) i++;
      if (i < n - 1) i += 2; else i = n;
      result.push(s.slice(start, i));
      continue;
    }

    // Enter inline math $
    if (s[i] === '$') {
      const start = i;
      i += 1;
      while (i < n && s[i] !== '$') i++;
      if (i < n) i += 1;
      result.push(s.slice(start, i));
      continue;
    }

    // Outside LaTeX: check for literal \n or \t
    if (s[i] === '\\' && i + 1 < n) {
      const next = s[i + 1];
      if (next === 'n') {
        result.push('\n');
        i += 2;
        continue;
      }
      if (next === 't') {
        result.push('\t');
        i += 2;
        continue;
      }
    }

    result.push(s[i]);
    i++;
  }

  return result.join('');
}

/**
 * Merge consecutive mathplot segments into combined payloads so they render
 * on a single Mafs canvas (multi-function graphs).
 */
function groupSegments(segments: RichSegment[]): RichSegment[] {
  const grouped: RichSegment[] = [];
  let mathplotQueue: string[] = [];

  const flushMathplots = () => {
    if (mathplotQueue.length === 0) return;
    if (mathplotQueue.length === 1) {
      grouped.push({ type: 'mathplot', value: mathplotQueue[0] });
    } else {
      grouped.push({ type: 'mathplot', value: JSON.stringify(mathplotQueue.map(q => JSON.parse(q))) });
    }
    mathplotQueue = [];
  };

  for (const seg of segments) {
    if (seg.type === 'mathplot') {
      mathplotQueue.push(seg.value);
    } else {
      flushMathplots();
      grouped.push(seg);
    }
  }
  flushMathplots();
  return grouped;
}

/**
 * Teks soal campuran: LaTeX/KaTeX (delimiter $), blok ```mermaid ... ```,
 * dan blok ```mathplot ... ``` (JSON untuk Mafs).
 */
export function RichText({ text, children, className = '' }: RichTextProps) {
  const raw = normalizeLiteralEscapes(text ?? children ?? '');
  const segments = groupSegments(parseRichSegments(raw));

  if (segments.length === 0) {
    return null;
  }

  return (
    <span className={className}>
      {segments.map((seg, idx) => {
        if (seg.type === 'mermaid') {
          return <MermaidDiagram key={`m-${idx}`} code={seg.value} />;
        }
        if (seg.type === 'mathplot') {
          return <MathPlot key={`p-${idx}`} raw={seg.value} />;
        }
        return <LatexText key={`t-${idx}`} text={seg.value} />;
      })}
    </span>
  );
}
