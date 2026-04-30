import { NextRequest } from 'next/server';
import { sql } from '@/lib/db/client';
import { parseRequestBody } from '@/lib/va/jwt';
import { buildResponse } from '@/lib/va/response';
import { formatCustomerName, parseVANO, validateCredentials } from '@/lib/va/validate';

export const runtime = 'nodejs';

function num(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v === 'bigint') return Number(v);
  if (typeof v === 'string') {
    const n = Number(v.trim().replace(/\s/g, ''));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function billToBmiString(amount: number): string {
  const cents = Math.round(amount * 100);
  const safe = cents < 0 ? 0 : cents;
  return String(safe);
}

export async function POST(req: NextRequest) {
  const debug = req.nextUrl.searchParams.get('debug') === '1';

  let payload: Record<string, unknown>;
  try {
    const body = await req.text();
    payload = await parseRequestBody(body, debug);
  } catch {
    return buildResponse({ ERR: '55', METHOD: 'INQUIRY' }, 200, debug);
  }

  const { CCY, VANO, METHOD, USERNAME, PASSWORD } = payload as Record<string, string>;

  if (!validateCredentials(USERNAME, PASSWORD)) {
    return buildResponse({ ERR: '55', METHOD: 'INQUIRY' }, 200, debug);
  }

  if (METHOD !== 'INQUIRY') {
    return buildResponse({ ERR: '30', METHOD: 'INQUIRY' }, 200, debug);
  }

  const parsed = parseVANO(String(VANO ?? ''));
  if (!parsed) {
    return buildResponse({ ERR: '30', METHOD: 'INQUIRY' }, 200, debug);
  }

  const vanoNorm = String(VANO ?? '').replace(/\D/g, '');

  const rows = (await sql`
    SELECT
      t.id,
      t.total_amount,
      t.status,
      t.student_id,
      s.full_name AS student_name,
      ay.name AS academic_year_name
    FROM tuition_transactions t
    LEFT JOIN core_students s ON s.id = t.student_id
    LEFT JOIN core_academic_years ay ON ay.id = t.academic_year_id
    WHERE regexp_replace(coalesce(t.va_no, ''), '[^0-9]', '', 'g') = ${vanoNorm}
    ORDER BY t.created_at DESC
    LIMIT 1
  `) as unknown as {
    id: unknown;
    total_amount: unknown;
    status: string | null;
    student_id: number | null;
    student_name: string | null;
    academic_year_name: string | null;
  }[];

  if (rows.length === 0) {
    return buildResponse({ ERR: '15', METHOD: 'INQUIRY' }, 200, debug);
  }

  const row = rows[0];
  const st = String(row.status ?? '').toLowerCase();

  if (st === 'success') {
    return buildResponse({ ERR: '88', METHOD: 'INQUIRY' }, 200, debug);
  }

  if (st !== 'pending') {
    return buildResponse({ ERR: '30', METHOD: 'INQUIRY' }, 200, debug);
  }

  const total = num(row.total_amount);
  const custRaw = row.student_name ?? '';
  const cust = formatCustomerName(custRaw);
  if (!cust) {
    return buildResponse({ ERR: '30', METHOD: 'INQUIRY' }, 200, debug);
  }

  const desc2 = String(row.academic_year_name ?? '').slice(0, 256);

  return buildResponse({
    CCY: CCY ?? '360',
    BILL: billToBmiString(total),
    DESCRIPTION: 'TUITION',
    DESCRIPTION2: desc2,
    CUSTNAME: cust,
    ERR: '00',
    METHOD: 'INQUIRY',
  }, 200, debug);
}
