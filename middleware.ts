import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const PUBLIC_PATHS = ['/login', '/api/auth', '/api/portal/favicon'];

const LOCAL_DEV_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

/** Dev: samakan tema/tenant dengan produksi (override via PORTAL_LOCAL_HOST_ALIAS). */
function effectivePortalHostname(portalHostname: string): string {
  if (!LOCAL_DEV_HOSTNAMES.has(portalHostname)) return portalHostname;
  const alias = process.env.PORTAL_LOCAL_HOST_ALIAS?.trim();
  return alias || 'parents.kreativaglobal.sch.id';
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hostHeader = request.headers.get('host') ?? request.nextUrl.hostname;
  const portalHostname = hostHeader.split(':')[0]?.trim().toLowerCase() ?? '';

  if (pathname === '/favicon.ico') {
    const url = request.nextUrl.clone();
    url.pathname = '/api/portal/favicon';
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-portal-hostname', effectivePortalHostname(portalHostname));
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
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

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-portal-hostname', effectivePortalHostname(portalHostname));
  requestHeaders.set(
    'x-tenant-id',
    portalHostname.includes('talentajuara') ? 'talenta' : 'kreativa',
  );

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
