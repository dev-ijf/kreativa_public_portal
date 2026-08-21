import { redisDiagnostic } from '@/lib/cache/upstash-redis';
import { zainsPing } from '@/lib/mysql-zains';

export const runtime = 'nodejs';

export async function GET() {
  const [redis, zainsIjf] = await Promise.all([redisDiagnostic(), zainsPing('ijf')]);
  return Response.json({
    redis,
    zains: { ijf: zainsIjf },
    env: {
      HOST_DB: Boolean(process.env.HOST_DB?.trim()),
      PORT_DB: process.env.PORT_DB?.trim() || null,
      USER_DB: Boolean(process.env.USER_DB?.trim()),
      PASS_DB: Boolean(process.env.PASS_DB != null && String(process.env.PASS_DB).length > 0),
      DB_IJF: process.env.DB_IJF?.trim() || null,
      DB_YAIM: Boolean(process.env.DB_YAIM?.trim()),
      DATABASE_URL: Boolean(process.env.DATABASE_URL?.trim()),
    },
    ts: new Date().toISOString(),
  });
}
