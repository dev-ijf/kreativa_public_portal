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
    return buildResponse({ ERR: '55', METHOD: 'ECHO' });
  }

  const { ECHODATE, METHOD, USERNAME, PASSWORD } = payload as Record<string, string>;

  if (!validateCredentials(USERNAME, PASSWORD)) {
    return buildResponse({ ERR: '55', METHOD: 'ECHO' });
  }

  if (!ECHODATE || typeof ECHODATE !== 'string') {
    return buildResponse({ ERR: '30', METHOD: 'ECHO' });
  }

  if (METHOD !== 'ECHO') {
    return buildResponse({ ERR: '30', METHOD: 'ECHO' });
  }

  return buildResponse({
    ERR: '00',
    METHOD: 'ECHO',
  });
}
