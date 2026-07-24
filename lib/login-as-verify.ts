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
  expectedAudience: 'parents' | 'learn' | 'kal',
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
