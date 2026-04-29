import { redisDiagnostic } from '@/lib/cache/upstash-redis';

export async function GET() {
  const redis = await redisDiagnostic();
  return Response.json({ redis, ts: new Date().toISOString() });
}
