import { NextRequest } from 'next/server';
import { parseRequestBody } from '@/lib/va/jwt';
import { buildResponse } from '@/lib/va/response';
import { validateCredentials } from '@/lib/va/validate';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const debug = req.nextUrl.searchParams.get('debug') === '1';

  let payload: Record<string, unknown>;
  try {
    const body = await req.text();
    payload = await parseRequestBody(body, debug);
  } catch {
    return buildResponse({ ERR: '55', METHOD: 'SIGNON' }, 200, debug);
  }

  const { SIGNONINFO, METHOD, USERNAME, PASSWORD } = payload as Record<string, string>;

  if (!validateCredentials(USERNAME, PASSWORD)) {
    return buildResponse({ ERR: '55', METHOD: 'SIGNON' }, 200, debug);
  }

  if (!SIGNONINFO || typeof SIGNONINFO !== 'string') {
    return buildResponse({ ERR: '30', METHOD: 'SIGNON' }, 200, debug);
  }

  const [signonDate, authCode] = SIGNONINFO.split(';');
  if (!signonDate || authCode !== 'bankmuamalatindonesia') {
    return buildResponse({ ERR: '55', METHOD: 'SIGNON' }, 200, debug);
  }

  if (METHOD !== 'SIGNON') {
    return buildResponse({ ERR: '30', METHOD: 'SIGNON' }, 200, debug);
  }

  const mitraName = process.env.MITRA_NAME?.trim() || 'Mitra';

  return buildResponse({
    ERR: `${signonDate};00;${mitraName}`,
    METHOD: 'SIGNON',
  }, 200, debug);
}
