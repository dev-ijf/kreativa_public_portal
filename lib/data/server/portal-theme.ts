import type { CSSProperties } from 'react';
import { cache } from 'react';
import { headers } from 'next/headers';
import { sql } from '@/lib/db/client';

export type PortalThemeResolved = {
  id: number;
  host_domain: string;
  portal_title: string;
  logo_url: string;
  primary_color: string;
  login_bg_url: string | null;
  welcome_text: string | null;
  favicon_url: string | null;
};

const FALLBACK_LOGO = '/assets/tenant/kreativa-logo.png';
const FALLBACK_PRIMARY = '#3A2EAE';

const FALLBACK_THEME: PortalThemeResolved = {
  id: 0,
  host_domain: 'default',
  portal_title: 'Parent Portal',
  logo_url: FALLBACK_LOGO,
  primary_color: FALLBACK_PRIMARY,
  login_bg_url: null,
  welcome_text: null,
  favicon_url: null,
};

export function normalizePortalHostname(hostHeader: string | null | undefined): string {
  if (!hostHeader) return '';
  const first = hostHeader.split(',')[0]?.trim() ?? hostHeader;
  const noPort = first.split(':')[0] ?? first;
  return noPort.trim().toLowerCase();
}

function tenantCssVars(primary: string): CSSProperties {
  return {
    '--tenant-primary': primary,
    '--tenant-primary-hover': 'color-mix(in srgb, var(--tenant-primary) 78%, black)',
    '--tenant-primary-light': 'color-mix(in srgb, var(--tenant-primary) 12%, white)',
  } as CSSProperties;
}

export function portalThemeToHtmlStyle(theme: PortalThemeResolved): CSSProperties {
  return tenantCssVars(theme.primary_color);
}

type ThemeRow = {
  id: number;
  host_domain: string;
  portal_title: string;
  logo_url: string | null;
  primary_color: string | null;
  login_bg_url: string | null;
  welcome_text: string | null;
  favicon_url: string | null;
};

async function fetchThemeByHostname(hostname: string): Promise<ThemeRow | null> {
  if (!hostname) return null;
  const rows = await sql`
    SELECT
      id,
      host_domain,
      portal_title,
      logo_url,
      primary_color,
      login_bg_url,
      welcome_text,
      favicon_url
    FROM core_portal_themes
    WHERE host_domain = ${hostname}
    LIMIT 1
  `;
  return (rows[0] as ThemeRow | undefined) ?? null;
}

function resolveTheme(row: ThemeRow | null): PortalThemeResolved {
  if (!row) return { ...FALLBACK_THEME };
  return {
    id: row.id,
    host_domain: row.host_domain,
    portal_title: row.portal_title || FALLBACK_THEME.portal_title,
    logo_url: row.logo_url?.trim() || FALLBACK_LOGO,
    primary_color: row.primary_color?.trim() || FALLBACK_PRIMARY,
    login_bg_url: row.login_bg_url,
    welcome_text: row.welcome_text,
    favicon_url: row.favicon_url?.trim() || null,
  };
}

/** Satu query per request; dipakai layout + generateMetadata + halaman portal. */
export const getPortalThemeForRequest = cache(async (): Promise<PortalThemeResolved> => {
  const headersList = await headers();
  const raw =
    headersList.get('x-portal-hostname') ??
    headersList.get('x-forwarded-host')?.split(',')[0]?.trim() ??
    headersList.get('host');
  const hostname = normalizePortalHostname(raw);
  const row = await fetchThemeByHostname(hostname);
  return resolveTheme(row);
});
