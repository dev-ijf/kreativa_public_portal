/** Extract YouTube video id from watch / youtu.be / embed URLs. */
export function youtubeVideoId(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    const host = u.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') {
      const id = u.pathname.split('/').filter(Boolean)[0];
      return id && /^[\w-]{6,}$/.test(id) ? id : null;
    }
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
      if (u.pathname.startsWith('/embed/')) {
        const id = u.pathname.slice('/embed/'.length).split('/')[0];
        return id && /^[\w-]{6,}$/.test(id) ? id : null;
      }
      const v = u.searchParams.get('v');
      if (v && /^[\w-]{6,}$/.test(v)) return v;
    }
  } catch {
    return null;
  }
  return null;
}

export function youtubeEmbedUrl(url: string): string | null {
  const id = youtubeVideoId(url);
  return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
}

export function isVideoMaterialType(materialType: string): boolean {
  const t = materialType.toLowerCase();
  return t === 'video' || t === 'video_link' || t === 'video_file';
}

export function isPlayableVideoUrl(url: string): boolean {
  if (youtubeVideoId(url)) return true;
  return /\.(mp4|webm|ogg)(\?|$)/i.test(url) || url.includes('blob.vercel-storage.com');
}

/**
 * Strip scripts/styles and keep a small allowlist for LMS session HTML.
 * YouTube iframes are rewritten to youtube-nocookie embeds.
 */
export function sanitizeSessionHtml(html: string): string {
  if (!html.trim()) return '';

  // Drop script/style blocks entirely
  let out = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');

  // Rewrite youtube iframes to safe embed src
  out = out.replace(
    /<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi,
    (tag) => {
      const srcMatch = tag.match(/\bsrc=["']([^"']+)["']/i);
      if (!srcMatch) return '';
      const embed = youtubeEmbedUrl(srcMatch[1]);
      if (!embed) return '';
      return `<iframe src="${embed}" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin" title="YouTube video"></iframe>`;
    },
  );

  // Remove event handlers and javascript: URLs
  out = out.replace(/\son\w+\s*=\s*(['"]).*?\1/gi, '');
  out = out.replace(/\shref\s*=\s*(['"])\s*javascript:[^'"]*\1/gi, '');

  // Drop tags outside allowlist (keep content)
  const allowed =
    /^(?:p|br|ul|ol|li|strong|b|em|i|u|h2|h3|h4|div|span|a|iframe)$/i;
  out = out.replace(/<\/?([a-z0-9]+)(\s[^>]*)?>/gi, (full, name: string) => {
    if (!allowed.test(name)) return '';
    if (/^iframe$/i.test(name)) {
      // Only keep iframes we already rewrote
      if (full.startsWith('</')) return '</iframe>';
      if (!/youtube-nocookie\.com\/embed\//i.test(full)) return '';
      return full;
    }
    if (/^a$/i.test(name)) {
      if (full.startsWith('</')) return '</a>';
      const href = full.match(/\bhref=["']([^"']+)["']/i)?.[1];
      if (!href || !/^https?:\/\//i.test(href)) return '<a>';
      return `<a href="${href}" target="_blank" rel="noopener noreferrer">`;
    }
    // Strip attributes on other tags
    if (full.startsWith('</')) return `</${name.toLowerCase()}>`;
    if (/^br$/i.test(name)) return '<br />';
    return `<${name.toLowerCase()}>`;
  });

  return out.trim();
}

/** Plain-ish length estimate for deciding default collapse. */
export function htmlPlainLength(html: string): number {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().length;
}
