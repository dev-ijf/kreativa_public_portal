import { NextRequest, NextResponse } from 'next/server';
import { encode } from 'next-auth/jwt';
import { sql } from '@/lib/db/client';
import { verifyLoginAsToken } from '@/lib/login-as-verify';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.redirect(new URL('/login?error=ImpersonationFailed', req.url));
  }

  try {
    const claims = await verifyLoginAsToken(token, 'parents');

    const rows = await sql`
      SELECT id, full_name, email, role
      FROM core_users
      WHERE LOWER(TRIM(email)) = ${claims.email}
        AND role IN ('parent', 'student')
      LIMIT 1
    `;
    const dbUser = rows[0] as
      | { id: number; full_name: string; email: string; role: string }
      | undefined;
    if (!dbUser) {
      return NextResponse.redirect(new URL('/login?error=ImpersonationFailed', req.url));
    }

    const maxAge = 30 * 24 * 60 * 60;
    const sessionToken = await encode({
      token: {
        email: dbUser.email,
        name: dbUser.full_name,
        sub: String(dbUser.id),
        userId: dbUser.id,
        role: dbUser.role,
        fullName: dbUser.full_name,
      },
      secret: process.env.NEXTAUTH_SECRET!,
      maxAge,
    });

    const res = NextResponse.redirect(new URL('/', req.url));
    const secure = req.nextUrl.protocol === 'https:';
    const cookieName = secure
      ? '__Secure-next-auth.session-token'
      : 'next-auth.session-token';
    res.cookies.set(cookieName, sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure,
      maxAge,
    });
    return res;
  } catch (err) {
    console.error('[impersonate/parents]', err);
    return NextResponse.redirect(new URL('/login?error=ImpersonationFailed', req.url));
  }
}
