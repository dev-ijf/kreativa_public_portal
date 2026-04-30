import { NextRequest } from 'next/server';
import { decodeToken } from '@/lib/va/jwt';
import { buildResponse } from '@/lib/va/response';
import { validateCredentials } from '@/lib/va/validate';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let payload: Record<string, unknown>;
  try {
    const body = await req.text();
    payload = await decodeToken(body);
  } catch {
    return buildResponse({ ERR: '55', METHOD: 'SIGNON' });
  }

  const { SIGNONINFO, METHOD, USERNAME, PASSWORD } = payload as Record<string, string>;

  if (!validateCredentials(USERNAME, PASSWORD)) {
    return buildResponse({ ERR: '55', METHOD: 'SIGNON' });
  }

  if (!SIGNONINFO || typeof SIGNONINFO !== 'string') {
    return buildResponse({ ERR: '30', METHOD: 'SIGNON' });
  }

  const [signonDate, authCode] = SIGNONINFO.split(';');
  if (!signonDate || authCode !== 'bankmuamalatindonesia') {
    return buildResponse({ ERR: '55', METHOD: 'SIGNON' });
  }

  if (METHOD !== 'SIGNON') {
    return buildResponse({ ERR: '30', METHOD: 'SIGNON' });
  }

  const mitraName = process.env.MITRA_NAME?.trim() || 'Mitra';

  return buildResponse({
    ERR: `${signonDate};00;${mitraName}`,
    METHOD: 'SIGNON',
  });
}
