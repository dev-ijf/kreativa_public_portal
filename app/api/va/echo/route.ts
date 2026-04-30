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
    return buildResponse({ ERR: '55', METHOD: 'ECHO' }, 200, debug);
  }

  const { ECHODATE, METHOD, USERNAME, PASSWORD } = payload as Record<string, string>;

  if (!validateCredentials(USERNAME, PASSWORD)) {
    return buildResponse({ ERR: '55', METHOD: 'ECHO' }, 200, debug);
  }

  if (!ECHODATE || typeof ECHODATE !== 'string') {
    return buildResponse({ ERR: '30', METHOD: 'ECHO' }, 200, debug);
  }

  if (METHOD !== 'ECHO') {
    return buildResponse({ ERR: '30', METHOD: 'ECHO' }, 200, debug);
  }

  return buildResponse({ ERR: '00', METHOD: 'ECHO' }, 200, debug);
}
