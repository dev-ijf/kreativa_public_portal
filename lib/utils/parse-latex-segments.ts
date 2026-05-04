export type LatexSegment =
  | { type: 'text'; value: string }
  | { type: 'inline'; value: string }
  | { type: 'block'; value: string };

/**
 * Find the next unescaped `$` starting from `start`.
 * A `$` preceded by `\` is considered escaped and skipped.
 */
function findClosingDollar(input: string, start: number): number {
  let j = start;
  while (j < input.length) {
    if (input[j] === '$' && input[j - 1] !== '\\') return j;
    j++;
  }
  return -1;
}

/**
 * Check if the `$` at position `i` is escaped (preceded by `\`).
 */
function isEscapedDollar(input: string, i: number): boolean {
  return i > 0 && input[i - 1] === '\\';
}

/**
 * Memecah string campuran teks + LaTeX dengan delimiter `$...$` (inline)
 * dan `$$...$$` (display / block).
 * Escaped dollar signs (`\$`) inside LaTeX are preserved and not treated as delimiters.
 */
export function parseLatexSegments(input: string): LatexSegment[] {
  const segments: LatexSegment[] = [];
  let i = 0;
  const n = input.length;

  while (i < n) {
    // Block math: $$...$$
    if (input[i] === '$' && input[i + 1] === '$' && !isEscapedDollar(input, i)) {
      i += 2;
      const start = i;
      // Find closing $$ (not escaped)
      let close = -1;
      let j = start;
      while (j < n - 1) {
        if (input[j] === '$' && input[j + 1] === '$' && !isEscapedDollar(input, j)) {
          close = j;
          break;
        }
        j++;
      }
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

    // Inline math: $...$
    if (input[i] === '$' && !isEscapedDollar(input, i)) {
      i += 1;
      const start = i;
      const close = findClosingDollar(input, start);
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

    // Plain text until next unescaped $
    let next = i;
    while (next < n) {
      if (input[next] === '$' && !isEscapedDollar(input, next)) break;
      next++;
    }
    if (next > i) {
      segments.push({ type: 'text', value: input.slice(i, next) });
    }
    i = next;
  }

  return promoteBareLaTeX(mergeAdjacentText(segments));
}

/**
 * If the entire result is a single text segment that looks like bare LaTeX
 * (contains backslash commands but no `$` delimiters), promote it to inline math.
 * This handles options stored as e.g. `\$8` or `\frac{1}{2}` without wrapping `$`.
 */
const LATEX_CMD_RE = /\\[a-zA-Z]+|\\[$%&#{}_]/;

function promoteBareLaTeX(segments: LatexSegment[]): LatexSegment[] {
  if (
    segments.length === 1 &&
    segments[0].type === 'text' &&
    LATEX_CMD_RE.test(segments[0].value)
  ) {
    return [{ type: 'inline', value: segments[0].value }];
  }
  return segments;
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
