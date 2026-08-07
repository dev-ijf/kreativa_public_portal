import { NextResponse } from 'next/server';
import {
  getPortalThemeForRequest,
  getColoredBrandIconUrl,
} from '@/lib/data/server/portal-theme';

const FALLBACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#3A2EAE"/></svg>`;

/**
 * Favicon per hostname: prefer colored logo_url (not white secondary logo).
 */
export async function GET(request: Request) {
  const theme = await getPortalThemeForRequest();
  const target = getColoredBrandIconUrl(theme)?.trim();

  if (target) {
    const url = /^https?:\/\//i.test(target)
      ? target
      : new URL(target, request.url).toString();
    return NextResponse.redirect(url, 302);
  }

  return new NextResponse(FALLBACK_SVG, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
