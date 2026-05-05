export type RichSegment =
  | { type: 'latex'; value: string }
  | { type: 'mermaid'; value: string }
  | { type: 'mathplot'; value: string };

const OPEN_MERMAID = /^\s*```\s*mermaid\s*$/i;
const OPEN_MATHPLOT = /^\s*```\s*mathplot\s*$/i;
const CLOSE_FENCE = /^\s*```\s*$/;

type FenceMode = 'latex' | 'mermaid' | 'mathplot';

/**
 * Memecah string menjadi fragmen LaTeX/teks, blok Mermaid, dan blok mathplot (JSON).
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

    buf.push(line);
  }

  if (mode === 'mermaid') {
    buf.push('```mermaid');
    buf.push(...mermaidBuf);
    mermaidBuf = [];
    mode = 'latex';
  }

  if (mode === 'mathplot') {
    buf.push('```mathplot');
    buf.push(...mathplotBuf);
    mathplotBuf = [];
    mode = 'latex';
  }

  flushLatex();

  return mergeAdjacentLatex(out);
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
