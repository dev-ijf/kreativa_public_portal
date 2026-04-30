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
 * Parse body request: jika debug=true, parse JSON biasa; jika tidak, decode JWT.
 */
export async function parseRequestBody(
  rawBody: string,
  debug: boolean,
): Promise<Record<string, unknown>> {
  if (debug) {
    return JSON.parse(rawBody) as Record<string, unknown>;
  }
  return decodeToken(rawBody);
}
