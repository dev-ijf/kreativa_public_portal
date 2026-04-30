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
    return buildResponse({ ERR: '55', METHOD: 'SIGNOFF' });
  }

  const { SIGNOFFINFO, METHOD, USERNAME, PASSWORD } = payload as Record<string, string>;

  if (!validateCredentials(USERNAME, PASSWORD)) {
    return buildResponse({ ERR: '55', METHOD: 'SIGNOFF' });
  }

  if (!SIGNOFFINFO || typeof SIGNOFFINFO !== 'string') {
    return buildResponse({ ERR: '30', METHOD: 'SIGNOFF' });
  }

  const [signoffDate, authCode] = SIGNOFFINFO.split(';');
  if (!signoffDate || authCode !== 'bankmuamalatindonesia') {
    return buildResponse({ ERR: '55', METHOD: 'SIGNOFF' });
  }

  if (METHOD !== 'SIGNOFF') {
    return buildResponse({ ERR: '30', METHOD: 'SIGNOFF' });
  }

  const mitraName = process.env.MITRA_NAME?.trim() || 'Mitra';

  return buildResponse({
    ERR: `${signoffDate};00;${mitraName}`,
    METHOD: 'SIGNOFF',
  });
}
