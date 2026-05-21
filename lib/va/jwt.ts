import * as jose from 'jose';

function getSecret(): Uint8Array {
  const raw = process.env.BMI_JWT_SECRET?.trim();
  if (!raw) {
    throw new Error('BMI_JWT_SECRET harus di-set untuk VA H2H (HS256).');
  }
  return new TextEncoder().encode(raw);
}

/**
 * Decode dan verifikasi JWT dari BMI (body request text/plain).
 */
export async function decodeToken(token: string): Promise<Record<string, unknown>> {
  const { payload } = await jose.jwtVerify(token, getSecret(), {
    algorithms: ['HS256'],
  });
  return payload as Record<string, unknown>;
}

/**
 * Encode payload respons sebagai JWT untuk dikembalikan ke BMI.
 */
export async function encodeToken(payload: Record<string, unknown>): Promise<string> {
  return new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .sign(getSecret());
}

/**
 * Detect apakah string merupakan format JWT (3 bagian dipisah titik).
 */
function looksLikeJwt(s: string): boolean {
  const trimmed = s.trim();
  if (trimmed.startsWith('{')) return false;
  const parts = trimmed.split('.');
  return parts.length === 3 && parts.every(p => p.length > 0);
}

/**
 * Parse body request:
 * - production (debug=false): body HARUS JWT, diverifikasi HS256
 * - debug (debug=true): auto-detect format body:
 *   - JWT → tetap verifikasi (test EncryptKey validity)
 *   - Plain JSON → parse langsung (test credential/logic saja)
 */
export async function parseRequestBody(
  rawBody: string,
  debug: boolean,
): Promise<Record<string, unknown>> {
  if (debug && !looksLikeJwt(rawBody)) {
    return JSON.parse(rawBody) as Record<string, unknown>;
  }
  return decodeToken(rawBody);
}

/**
 * Decode JWT tanpa verifikasi signature — digunakan hanya untuk membaca
 * field METHOD / CCY dari token yang gagal verifikasi (response RC 55).
 */
export function decodeTokenUnsafe(token: string): Record<string, unknown> {
  try {
    return jose.decodeJwt(token) as Record<string, unknown>;
  } catch {
    return {};
  }
}
