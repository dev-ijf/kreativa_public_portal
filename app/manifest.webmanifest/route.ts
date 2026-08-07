import { NextResponse } from 'next/server';
import {
  getPortalThemeForRequest,
  getColoredBrandIconUrl,
} from '@/lib/data/server/portal-theme';
import { getPwaAppNames, resolvePortalTenantFromHost } from '@/lib/portal/tenant';
import { ensureUsablePrimary } from '@/lib/utils/color';

function toAbsoluteUrl(requestUrl: string, maybeRelative: string): string {
  if (/^https?:\/\//i.test(maybeRelative)) return maybeRelative;
  return new URL(maybeRelative, requestUrl).toString();
}

export async function GET(request: Request) {
  const theme = await getPortalThemeForRequest();
  const tenant = resolvePortalTenantFromHost(theme.host_domain);
  const { name, shortName } = getPwaAppNames(tenant);
  const iconSrc = toAbsoluteUrl(request.url, getColoredBrandIconUrl(theme));
  const themeColor = ensureUsablePrimary(
    theme.primary_color,
    theme.secondary_color?.trim() || '#4f46e5',
  );

  const manifest = {
    id: '/',
    name,
    short_name: shortName,
    description: theme.welcome_text ?? theme.portal_title,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#ffffff',
    theme_color: themeColor,
    icons: [
      {
        src: iconSrc,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: iconSrc,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
