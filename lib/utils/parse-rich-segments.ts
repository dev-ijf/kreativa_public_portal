export type RichSegment =
  | { type: 'latex'; value: string }
  | { type: 'mermaid'; value: string }
  | { type: 'mathplot'; value: string };

const OPEN_MERMAID = /^\s*```\s*mermaid\s*$/i;
const OPEN_MATHPLOT = /^\s*```\s*mathplot\s*$/i;
const CLOSE_FENCE = /^\s*```\s*$/;

/**
 * Global regex to find inline ```mathplot{...}``` fences anywhere inside a line.
 * Captures the JSON payload.
 */
const INLINE_MATHPLOT_G = /```\s*mathplot\s*(\{[^`]*?\})\s*```/gi;

/**
 * Global regex to find inline ```mermaid ... ``` fences anywhere inside a line.
 * Captures the diagram code.
 */
const INLINE_MERMAID_G = /```\s*mermaid\s+([^`]+?)\s*```/gi;

type FenceMode = 'latex' | 'mermaid' | 'mathplot';

/**
 * Memecah string menjadi fragmen LaTeX/teks, blok Mermaid, dan blok mathplot (JSON).
 * Mendukung:
 * - Multi-line fenced blocks (```mathplot\n{...}\n```)
 * - Inline fences on a single line (```mathplot{...}```)
 * - Multiple inline fences per line
 */
export function parseRichSegments(input: string): RichSegment[] {
  const lines = input.split('\n');
  const out: RichSegment[] = [];
  let buf: string[] = [];
  let mode: FenceMode = 'latex';
  let mermaidBuf: string[] = [];
  let mathplotBuf: string[] = [];

  const flushLatex = () => {
    if (buf.length === 0) return;
    const s = buf.join('\n');
    if (s.length > 0) out.push({ type: 'latex', value: s });
    buf = [];
  };

  const flushMermaid = () => {
    const s = mermaidBuf.join('\n').trim();
    if (s.length > 0) out.push({ type: 'mermaid', value: s });
    mermaidBuf = [];
  };

  const flushMathplot = () => {
    const s = mathplotBuf.join('\n').trim();
    if (s.length > 0) out.push({ type: 'mathplot', value: s });
    mathplotBuf = [];
  };

  for (const line of lines) {
    if (mode === 'mermaid') {
      if (CLOSE_FENCE.test(line)) {
        flushMermaid();
        mode = 'latex';
      } else {
        mermaidBuf.push(line);
      }
      continue;
    }

    if (mode === 'mathplot') {
      if (CLOSE_FENCE.test(line)) {
        flushMathplot();
        mode = 'latex';
      } else {
        mathplotBuf.push(line);
      }
      continue;
    }

    // Multi-line fence openers
    if (OPEN_MERMAID.test(line)) {
      flushLatex();
      mode = 'mermaid';
      mermaidBuf = [];
      continue;
    }

    if (OPEN_MATHPLOT.test(line)) {
      flushLatex();
      mode = 'mathplot';
      mathplotBuf = [];
      continue;
    }

    // Check for inline fences within the line
    if (hasInlineFence(line)) {
      flushLatex();
      extractInlineSegments(line, out);
      continue;
    }

    buf.push(line);
  }

  if (mode === 'mermaid') {
    buf.push('```mermaid');
    buf.push(...mermaidBuf);
  }

  if (mode === 'mathplot') {
    buf.push('```mathplot');
    buf.push(...mathplotBuf);
  }

  flushLatex();

  return mergeAdjacentLatex(out);
}

/**
 * Quick check if a line contains any inline fence pattern.
 */
function hasInlineFence(line: string): boolean {
  return /```\s*mathplot\s*\{/i.test(line) || /```\s*mermaid\s+\S/i.test(line);
}

/**
 * Extract all inline mathplot/mermaid fences from a line and push segments.
 * Text between fences is added as latex segments.
 */
function extractInlineSegments(line: string, out: RichSegment[]): void {
  // Build a combined regex that matches either mathplot or mermaid inline fences
  const combined = /```\s*(?:mathplot\s*(\{[^`]*?\})|mermaid\s+([^`]+?))\s*```/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = combined.exec(line)) !== null) {
    // Push any text before this match as latex
    if (match.index > lastIndex) {
      const before = line.slice(lastIndex, match.index).trim();
      if (before.length > 0) out.push({ type: 'latex', value: before });
    }

    if (match[1]) {
      // mathplot
      out.push({ type: 'mathplot', value: match[1].trim() });
    } else if (match[2]) {
      // mermaid
      out.push({ type: 'mermaid', value: match[2].trim() });
    }

    lastIndex = match.index + match[0].length;
  }

  // Push any trailing text as latex
  if (lastIndex < line.length) {
    const after = line.slice(lastIndex).trim();
    if (after.length > 0) out.push({ type: 'latex', value: after });
  }
}

function mergeAdjacentLatex(segments: RichSegment[]): RichSegment[] {
  const merged: RichSegment[] = [];
  for (const seg of segments) {
    const last = merged[merged.length - 1];
    if (seg.type === 'latex' && last?.type === 'latex') {
      last.value += `\n${seg.value}`;
    } else {
      merged.push(
        seg.type === 'latex'
          ? { type: 'latex', value: seg.value }
          : seg.type === 'mermaid'
            ? { type: 'mermaid', value: seg.value }
            : { type: 'mathplot', value: seg.value },
      );
    }
  }
  return merged;
}
