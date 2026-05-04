export type LatexSegment =
  | { type: 'text'; value: string }
  | { type: 'inline'; value: string }
  | { type: 'block'; value: string };

/**
 * Memecah string campuran teks + LaTeX dengan delimiter `$...$` (inline)
 * dan `$$...$$` (display / block). Delimiter display dicek lebih dulu.
 */
export function parseLatexSegments(input: string): LatexSegment[] {
  const segments: LatexSegment[] = [];
  let i = 0;
  const n = input.length;

  while (i < n) {
    if (input[i] === '$' && input[i + 1] === '$') {
      i += 2;
      const start = i;
      const close = input.indexOf('$$', start);
      if (close === -1) {
        segments.push({ type: 'text', value: input.slice(i - 2) });
        break;
      }
      const inner = input.slice(start, close).trim();
      if (inner.length > 0) {
        segments.push({ type: 'block', value: inner });
      }
      i = close + 2;
      continue;
    }

    if (input[i] === '$') {
      i += 1;
      const start = i;
      const close = input.indexOf('$', start);
      if (close === -1) {
        segments.push({ type: 'text', value: '$' + input.slice(start) });
        break;
      }
      const inner = input.slice(start, close).trim();
      if (inner.length > 0) {
        segments.push({ type: 'inline', value: inner });
      }
      i = close + 1;
      continue;
    }

    const next = input.indexOf('$', i);
    const end = next === -1 ? n : next;
    if (end > i) {
      segments.push({ type: 'text', value: input.slice(i, end) });
    }
    i = end;
  }

  return mergeAdjacentText(segments);
}

function mergeAdjacentText(segments: LatexSegment[]): LatexSegment[] {
  const out: LatexSegment[] = [];
  for (const s of segments) {
    const last = out[out.length - 1];
    if (s.type === 'text' && last?.type === 'text') {
      last.value += s.value;
    } else {
      out.push(s);
    }
  }
  return out;
}
