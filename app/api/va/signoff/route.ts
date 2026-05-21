import { NextRequest } from 'next/server';
import { parseRequestBody } from '@/lib/va/jwt';
import { buildResponse } from '@/lib/va/response';
import { validateCredentials } from '@/lib/va/validate';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const debug = req.nextUrl.searchParams.get('debug') === '1';

  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return buildResponse({ ERR: '55', METHOD: 'SIGNOFF' }, 200, debug);
  }

  let payload: Record<string, unknown>;
  try {
    payload = await parseRequestBody(rawBody, debug);
  } catch {
    return buildResponse({ ERR: '55', METHOD: 'SIGNOFF' }, 200, debug);
  }

  const { SIGNOFFINFO, METHOD, USERNAME, PASSWORD, ENCRYPTKEY, JWT_SECRET } = payload as Record<string, string>;

  if (!validateCredentials(USERNAME, PASSWORD, ENCRYPTKEY ?? JWT_SECRET)) {
    return buildResponse({ ERR: '55', METHOD: 'SIGNOFF' }, 200, debug);
  }

  if (!SIGNOFFINFO || typeof SIGNOFFINFO !== 'string') {
    return buildResponse({ ERR: '30', METHOD: 'SIGNOFF' }, 200, debug);
  }

  const [signoffDate, authCode] = SIGNOFFINFO.split(';');
  if (!signoffDate || authCode !== 'bankmuamalatindonesia') {
    return buildResponse({ ERR: '55', METHOD: 'SIGNOFF' }, 200, debug);
  }

  if (METHOD !== 'SIGNOFF') {
    return buildResponse({ ERR: '30', METHOD: 'SIGNOFF' }, 200, debug);
  }

  const mitraName = process.env.MITRA_NAME?.trim() || 'Mitra';

  return buildResponse({
    ERR: `${signoffDate};00;${mitraName}`,
    METHOD: 'SIGNOFF',
  }, 200, debug);
}
