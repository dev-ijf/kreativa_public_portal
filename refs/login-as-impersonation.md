# Login As — Impersonation Token Contract

Admin ERP (`one.*`) can open Parents / Learn / KAL as a student or parent without using their Google account.

This doc is the **implementation guide for sibling apps**. Copy this file into:

| Repo | Host | Audience (`aud`) |
|------|------|------------------|
| `kreativa_public_portal` | `parents.{domain}` | `parents` |
| `kreativa_learning_management_system` | `learn.{domain}` | `learn` |
| `adaptive-learning` | `kal.{domain}` | `kal` |

ERP already mints tokens and opens:

```text
https://{app}.{domain}/api/auth/impersonate?token=...
```

Each sibling app must implement that route.

---

## Env (all 4 apps — same value)

```bash
IMPERSONATION_SECRET="<long random string>"
```

Also keep existing `NEXTAUTH_SECRET` (used to encode the session cookie).

Domains:

| School name contains | Base domain |
|----------------------|-------------|
| `talenta` or `juara` (case-insensitive) | `talentajuara.sch.id` |
| otherwise | `kreativaglobal.sch.id` |

---

## Token contract (minted by ERP)

| Claim | Type | Notes |
|-------|------|-------|
| `email` | string | Target Google/SSO email in `core_users` |
| `roleHint` | `'parent' \| 'student'` | Hint only; still load real role from DB |
| `targetApp` | `'parents' \| 'learn' \| 'kal'` | Must match host app |
| `studentId` | number | Student row that triggered Login As |
| `adminUserId` | number | ERP admin who minted the token |
| `jti` | string | Unique id |
| `iss` | string | Always `kreativa-erp-login-as` |
| `aud` | string | `parents` / `learn` / `kal` |
| `iat` / `exp` | number | TTL **60 seconds** |
| alg | HS256 | Secret = `IMPERSONATION_SECRET` |

---

## Endpoint to add

```text
GET /api/auth/impersonate?token=<jwt>
```

### Behaviour

1. Read `token` query param; reject if missing.
2. Verify JWT with `IMPERSONATION_SECRET`, `iss = kreativa-erp-login-as`, `aud` = this app.
3. Load user from DB by `email` (same rules as Google `signIn`).
4. Encode a NextAuth JWT session (same claims your Google callbacks put on the token).
5. Set the session cookie and redirect to `/`.
6. On any failure → redirect `/login?error=ImpersonationFailed` (or return 401).

### Cookie name

NextAuth v4 defaults:

- HTTPS: `__Secure-next-auth.session-token`
- HTTP (local): `next-auth.session-token`

Use `encode` from `next-auth/jwt` with `NEXTAUTH_SECRET`.

---

## Shared verify helper (optional)

```ts
// lib/login-as-verify.ts
import { jwtVerify, type JWTPayload } from 'jose';

const ISSUER = 'kreativa-erp-login-as';

export type LoginAsClaims = {
  email: string;
  roleHint: 'parent' | 'student';
  targetApp: 'parents' | 'learn' | 'kal';
  studentId: number;
  adminUserId: number;
  jti: string;
};

export async function verifyLoginAsToken(
  token: string,
  expectedAudience: 'parents' | 'learn' | 'kal'
): Promise<LoginAsClaims & JWTPayload> {
  const secret = process.env.IMPERSONATION_SECRET?.trim();
  if (!secret) throw new Error('IMPERSONATION_SECRET missing');

  const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
    issuer: ISSUER,
    audience: expectedAudience,
  });

  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  if (!email) throw new Error('Invalid email claim');

  return {
    ...payload,
    email,
    roleHint: payload.roleHint as LoginAsClaims['roleHint'],
    targetApp: payload.targetApp as LoginAsClaims['targetApp'],
    studentId: Number(payload.studentId),
    adminUserId: Number(payload.adminUserId),
    jti: String(payload.jti ?? ''),
  };
}
```

Install if needed: `npm i jose`

---

## 1) Parents (`kreativa_public_portal`)

Allowlist: `core_users.role IN ('parent','student')` — same as Google login.

Session claims (match `lib/auth.ts`): `userId`, `role`, `fullName`, plus email/name.

```ts
// app/api/auth/impersonate/route.ts
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
```

---

## 2) Learn (`kreativa_learning_management_system`)

Allowlist: email exists in `core_users` (same as Google `signIn`). Prefer linked student for student logins.

Session claims (match `lib/auth.ts`): `userId`, `studentId`, `schoolId`, `role`.

```ts
// app/api/auth/impersonate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { encode } from 'next-auth/jwt';
import { sql } from '@/lib/db';
import { verifyLoginAsToken } from '@/lib/login-as-verify';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.redirect(new URL('/login?error=ImpersonationFailed', req.url));
  }

  try {
    const claims = await verifyLoginAsToken(token, 'learn');

    const rows = await sql`
      SELECT u.id as user_id, u.role, u.school_id, u.email, u.full_name,
             s.id as student_id
      FROM core_users u
      LEFT JOIN core_students s ON s.user_id = u.id
      WHERE LOWER(TRIM(u.email)) = ${claims.email}
      LIMIT 1
    `;
    const dbUser = rows[0] as
      | {
          user_id: number;
          role: string;
          school_id: number | null;
          email: string;
          full_name: string;
          student_id: number | null;
        }
      | undefined;
    if (!dbUser) {
      return NextResponse.redirect(new URL('/login?error=ImpersonationFailed', req.url));
    }

    const maxAge = 30 * 24 * 60 * 60;
    const sessionToken = await encode({
      token: {
        email: dbUser.email,
        name: dbUser.full_name,
        sub: String(dbUser.user_id),
        userId: dbUser.user_id,
        studentId: dbUser.student_id,
        schoolId: dbUser.school_id,
        role: dbUser.role,
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
    console.error('[impersonate/learn]', err);
    return NextResponse.redirect(new URL('/login?error=ImpersonationFailed', req.url));
  }
}
```

---

## 3) KAL / Adaptive Learning (`adaptive-learning`)

Allowlist: active student linked to the email (same as Google `signIn` in `lib/auth.ts`).

Session claims: `studentId`, `schoolId`, `fullName`, `photoUrl`.

```ts
// app/api/auth/impersonate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { encode } from 'next-auth/jwt';
import { query } from '@/lib/db';
import { verifyLoginAsToken } from '@/lib/login-as-verify';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.redirect(new URL('/login?error=ImpersonationFailed', req.url));
  }

  try {
    const claims = await verifyLoginAsToken(token, 'kal');

    const rows = await query<{
      id: number;
      school_id: number;
      full_name: string;
      email: string;
    }>(
      `SELECT s.id, s.full_name, s.school_id, u.email
       FROM core_students s
       JOIN core_users u ON s.user_id = u.id
       WHERE LOWER(TRIM(u.email)) = $1
         AND s.enrollment_status = 'active'
       LIMIT 1`,
      [claims.email]
    );
    const student = rows[0];
    if (!student) {
      return NextResponse.redirect(new URL('/login?error=ImpersonationFailed', req.url));
    }

    const maxAge = 30 * 24 * 60 * 60;
    const sessionToken = await encode({
      token: {
        email: student.email,
        name: student.full_name,
        sub: String(student.id),
        studentId: student.id,
        schoolId: student.school_id,
        fullName: student.full_name,
        photoUrl: '',
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
    console.error('[impersonate/kal]', err);
    return NextResponse.redirect(new URL('/login?error=ImpersonationFailed', req.url));
  }
}
```

---

## ERP side (already implemented)

| Piece | Path |
|-------|------|
| Mint + domain helpers | `lib/login-as.ts` |
| Mint API | `POST /api/students/[id]/login-as` body `{ target }` |
| UI | Students list → Login As menu |

Targets:

| `target` | Opens | Email |
|----------|-------|-------|
| `student_parents` | `parents.{domain}` | student |
| `father_parents` | `parents.{domain}` | father |
| `mother_parents` | `parents.{domain}` | mother |
| `student_learn` | `learn.{domain}` | student |
| `student_kal` | `kal.{domain}` | student |

Who can mint: `superadmin`, `school_admin` (scoped to their school).

---

## Security notes

- Token TTL is 60s — open the tab immediately after mint.
- Never log the full token in production.
- Only ERP admins can mint; sibling apps only **accept** tokens.
- HTTPS in production so `__Secure-` cookie is set.
- Optional later: audit log (`adminUserId`, `email`, `targetApp`, timestamp) and an “Impersonating…” banner.

---

## Checklist

- [ ] Set `IMPERSONATION_SECRET` on ERP, parents, learn, kal (identical value)
- [ ] Parents: add `lib/login-as-verify.ts` + `app/api/auth/impersonate/route.ts`
- [ ] Learn: same
- [ ] KAL: same (`aud = kal`)
- [ ] Confirm `NEXTAUTH_SECRET` is set on each app (session encode)
- [ ] Smoke test: ERP → Login As → new tab lands authenticated on `/`
