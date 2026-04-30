import { encodeToken } from '@/lib/va/jwt';

const BMI_CONTENT_TYPE = 'text/plain; charset=ISO-8859-1';

/**
 * Bungkus payload sebagai JWT (produksi) atau JSON biasa (debug).
 */
export async function buildResponse(
  payload: Record<string, unknown>,
  status = 200,
  debug = false,
): Promise<Response> {
  if (debug) {
    return Response.json(payload, { status });
  }

  const token = await encodeToken(payload);
  return new Response(token, {
    status,
    headers: { 'Content-Type': BMI_CONTENT_TYPE },
  });
}
