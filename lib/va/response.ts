import { encodeToken } from '@/lib/va/jwt';

const CONTENT_TYPE = 'text/plain; charset=ISO-8859-1';

/**
 * Bungkus payload respons sebagai JWT dengan Content-Type BMI.
 */
export async function buildResponse(
  payload: Record<string, unknown>,
  status = 200,
): Promise<Response> {
  const token = await encodeToken(payload);
  return new Response(token, {
    status,
    headers: {
      'Content-Type': CONTENT_TYPE,
    },
  });
}
