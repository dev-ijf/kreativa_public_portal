export type RichSegment =
  | { type: 'latex'; value: string }
  | { type: 'mermaid'; value: string };

const OPEN_FENCE = /^\s*```\s*mermaid\s*$/i;
const CLOSE_FENCE = /^\s*```\s*$/;

/**
 * Memecah string menjadi fragmen LaTeX/teks biasa dan blok diagram Mermaid.
 * Hanya blok fenced Markdown ` ```mermaid ... ``` ` yang dikenali (case-insensitive).
 */
export function parseRichSegments(input: string): RichSegment[] {
  const lines = input.split('\n');
  const out: RichSegment[] = [];
  let buf: string[] = [];
  let inMermaid = false;
  let mermaidBuf: string[] = [];

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

  for (const line of lines) {
    if (inMermaid) {
      if (CLOSE_FENCE.test(line)) {
        flushMermaid();
        inMermaid = false;
      } else {
        mermaidBuf.push(line);
      }
      continue;
    }

    if (OPEN_FENCE.test(line)) {
      flushLatex();
      inMermaid = true;
      mermaidBuf = [];
      continue;
    }

    buf.push(line);
  }

  if (inMermaid) {
    buf.push('```mermaid');
    buf.push(...mermaidBuf);
    mermaidBuf = [];
    inMermaid = false;
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
      merged.push(seg.type === 'latex' ? { type: 'latex', value: seg.value } : { type: 'mermaid', value: seg.value });
    }
  }
  return merged;
}
