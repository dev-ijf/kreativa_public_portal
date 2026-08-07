import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const PUBLIC_PATHS = [
  '/login',
  '/api/auth',
  '/api/portal/favicon',
  '/api/internal/qstash',
  '/manifest.webmanifest',
  '/sw.js',
];

const LOCAL_DEV_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

/** Dev: samakan tema/tenant dengan produksi (override via PORTAL_LOCAL_HOST_ALIAS). */
function effectivePortalHostname(portalHostname: string): string {
  if (!LOCAL_DEV_HOSTNAMES.has(portalHostname)) return portalHostname;
  const alias = process.env.PORTAL_LOCAL_HOST_ALIAS?.trim();
  return alias || 'parents.kreativaglobal.sch.id';
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Internal API (QStash webhook, diag, dll): skip auth middleware.
  // Penting untuk QStash: getToken() bisa consume body stream → signature failed.
  if (pathname.startsWith('/api/internal') || pathname.startsWith('/api/va')) {
    return NextResponse.next();
  }

  const hostHeader = request.headers.get('host') ?? request.nextUrl.hostname;
  const portalHostname = hostHeader.split(':')[0]?.trim().toLowerCase() ?? '';

  const requestHeaders = new Headers(request.headers);
  const effectiveHost = effectivePortalHostname(portalHostname);
  requestHeaders.set('x-portal-hostname', effectiveHost);
  requestHeaders.set(
    'x-tenant-id',
    effectiveHost.includes('talentajuara') || portalHostname.includes('talentajuara')
      ? 'talenta'
      : 'kreativa',
  );

  if (pathname === '/favicon.ico') {
    const url = request.nextUrl.clone();
    url.pathname = '/api/portal/favicon';
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  }

  // PWA assets must stay public and carry tenant headers for theme lookup.
  if (pathname === '/manifest.webmanifest' || pathname === '/sw.js') {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token && !isPublicPath) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (token && pathname === '/login') {
    const homeUrl = new URL('/', request.url);
    return NextResponse.redirect(homeUrl);
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
