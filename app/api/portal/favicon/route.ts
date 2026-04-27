import { NextResponse } from 'next/server';
import { getPortalThemeForRequest } from '@/lib/data/server/portal-theme';

const FALLBACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#3A2EAE"/></svg>`;

/**
 * Favicon per hostname: browser meminta /favicon.ico atau link ke route ini;
 * redirect ke Blob (atau SVG fallback) supaya tidak tertimpa ikon default Vercel.
 */
export async function GET() {
  const theme = await getPortalThemeForRequest();
  const target = theme.favicon_url?.trim();

  if (target) {
    return NextResponse.redirect(target, 302);
  }

  return new NextResponse(FALLBACK_SVG, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
