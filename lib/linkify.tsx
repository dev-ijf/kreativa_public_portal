import type { ReactNode } from 'react';
import { createElement, Fragment } from 'react';

const URL_RE = /(https?:\/\/[^\s<]+[^\s<.,;:!?"')\]])/gi;

/**
 * Split plain text into text + clickable http(s) links (open in new tab).
 */
export function linkifyToReact(text: string, linkClassName?: string): ReactNode {
  if (!text) return null;
  const parts: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(URL_RE.source, 'gi');
  let i = 0;
  while ((match = re.exec(text)) != null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    const url = match[0];
    parts.push(
      createElement(
        'a',
        {
          key: `u-${i++}`,
          href: url,
          target: '_blank',
          rel: 'noopener noreferrer',
          className: linkClassName ?? 'underline break-all',
        },
        url,
      ),
    );
    last = match.index + url.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return createElement(Fragment, null, ...parts);
}
