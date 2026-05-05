'use client';

import { parseRichSegments } from '@/lib/utils/parse-rich-segments';
import { LatexText } from '@/components/ui/LatexText';
import { MathPlot } from '@/components/ui/MathPlot';
import { MermaidDiagram } from '@/components/ui/MermaidDiagram';

export type RichTextProps = {
  text?: string;
  children?: string;
  className?: string;
};

/**
 * Teks soal campuran: LaTeX/KaTeX (delimiter $), blok ```mermaid ... ```,
 * dan blok ```mathplot ... ``` (JSON untuk Mafs).
 */
export function RichText({ text, children, className = '' }: RichTextProps) {
  const raw = text ?? children ?? '';
  const segments = parseRichSegments(raw);

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
