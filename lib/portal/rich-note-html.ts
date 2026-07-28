/**
 * Sanitize TipTap / rich-note HTML for parent portal display.
 * Allowlist only — no scripts, iframes, or event handlers.
 */
export function looksLikeHtml(value: string): boolean {
  return /<[a-z][\s\S]*>/i.test(value);
}

/** True when note has visible text (plain or after stripping TipTap HTML). */
export function hasRichNoteContent(value: string | null | undefined): boolean {
  if (value == null) return false;
  const raw = String(value).trim();
  if (!raw) return false;
  if (looksLikeHtml(raw)) {
    return htmlPlainLength(sanitizeRichNoteHtml(raw)) > 0;
  }
  return true;
}

export function htmlPlainLength(html: string): number {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim().length;
}

export function sanitizeRichNoteHtml(html: string): string {
  if (!html.trim()) return '';

  let out = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '');

  out = out.replace(/\son\w+\s*=\s*(['"]).*?\1/gi, '');
  out = out.replace(/\shref\s*=\s*(['"])\s*javascript:[^'"]*\1/gi, '');

  const allowed =
    /^(?:p|br|ul|ol|li|strong|b|em|i|u|s|strike|h1|h2|h3|blockquote|div|span|a|img)$/i;

  out = out.replace(/<\/?([a-z0-9]+)(\s[^>]*)?>/gi, (full, name: string) => {
    if (!allowed.test(name)) return '';
    if (/^a$/i.test(name)) {
      if (full.startsWith('</')) return '</a>';
      const href = full.match(/\bhref=["']([^"']+)["']/i)?.[1];
      if (!href || !/^https?:\/\//i.test(href)) return '<a>';
      return `<a href="${href}" target="_blank" rel="noopener noreferrer">`;
    }
    if (/^img$/i.test(name)) {
      if (full.startsWith('</')) return '';
      const src = full.match(/\bsrc=["']([^"']+)["']/i)?.[1];
      if (!src || !/^https?:\/\//i.test(src)) return '';
      const alt = full.match(/\balt=["']([^"']*)["']/i)?.[1] ?? '';
      return `<img src="${src}" alt="${alt}" loading="lazy" />`;
    }
    if (full.startsWith('</')) return `</${name.toLowerCase()}>`;
    if (/^br$/i.test(name)) return '<br />';
    return `<${name.toLowerCase()}>`;
  });

  return out.trim();
}
