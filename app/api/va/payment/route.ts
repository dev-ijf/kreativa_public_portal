import { NextRequest } from 'next/server';
import { sql } from '@/lib/db/client';
import { schedulePaymentSuccessWhatsAppJob } from '@/lib/qstash/schedule-payment-success-whatsapp';
import { releaseBmiPaymentKey, tryClaimBmiPaymentKey } from '@/lib/va/bmi-payment-idempotency';
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

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function parseScaledAmount(raw: unknown): number | null {
  const s = String(raw ?? '').trim().replace(/\s/g, '');
  if (!s) return null;
  const v = Number(s);
  if (!Number.isFinite(v)) return null;
  return v / 100;
}

type DetailRow = {
  bill_id: number;
  amount_paid: number;
  is_installment: boolean;
  payment_type: string;
  bill_total: number;
  bill_paid: number;
  bill_min: number;
};

function classifyPaymentMode(details: DetailRow[]): 'OPEN' | 'PARTIAL' | 'FULL' {
  for (const d of details) {
    const pt = String(d.payment_type ?? '').toLowerCase();
    if (pt === 'open' || pt === 'none') return 'OPEN';
  }
  for (const d of details) {
    if (d.is_installment) return 'PARTIAL';
  }
  return 'FULL';
}

function billRemainingMap(details: DetailRow[]): Map<number, number> {
  const m = new Map<number, number>();
  for (const d of details) {
    const rem = Math.max(0, round2(d.bill_total - d.bill_paid));
    m.set(d.bill_id, rem);
  }
  return m;
}

function sumRemaining(m: Map<number, number>): number {
  let s = 0;
  for (const v of m.values()) s += v;
  return round2(s);
}

function allocateByBill(
  details: DetailRow[],
  effectivePayment: number,
  capByBill: Map<number, number>,
): Map<number, number> {
  const totalLine = details.reduce((s, d) => s + d.amount_paid, 0);
  if (totalLine <= 0 || effectivePayment <= 0) return new Map();

  const perLine: number[] = [];
  let acc = 0;
  for (let i = 0; i < details.length; i += 1) {
    const d = details[i];
    const isLast = i === details.length - 1;
    const raw = isLast ? round2(effectivePayment - acc) : round2((effectivePayment * d.amount_paid) / totalLine);
    perLine.push(raw);
    acc = round2(acc + raw);
  }

  const byBill = new Map<number, number>();
  for (let i = 0; i < details.length; i += 1) {
    const d = details[i];
    const bid = d.bill_id;
    const cap = capByBill.get(bid) ?? 0;
    const prev = byBill.get(bid) ?? 0;
    const room = Math.max(0, round2(cap - prev));
    const add = Math.min(perLine[i] ?? 0, room);
    byBill.set(bid, round2(prev + add));
  }
  return byBill;
}

function nextBillStatus(params: { billTotal: number; newPaid: number }): string {
  const { billTotal, newPaid } = params;
  if (newPaid + 0.005 >= billTotal) return 'paid';
  if (newPaid > 0.005) return 'partial';
  return 'unpaid';
}

/** ERR 30 — di `?debug=1` tambah `_debug` supaya mudah dilacak (tidak dikirim BMI produksi). */
async function pay30(debug: boolean, reason: string): Promise<Response> {
  return buildResponse(
    debug ? { ERR: '30', METHOD: 'PAYMENT', _debug: reason } : { ERR: '30', METHOD: 'PAYMENT' },
    200,
    debug,
  );
}

export async function POST(req: NextRequest) {
  const debug = req.nextUrl.searchParams.get('debug') === '1';

  let payload: Record<string, unknown>;
  try {
    const body = await req.text();
    payload = await parseRequestBody(body, debug);
  } catch {
    return buildResponse({ ERR: '55', METHOD: 'PAYMENT' }, 200, debug);
  }

  const {
    TRXDATE, CCY, REFNO, BILL, PAYMENT, CHANNELID,
    VANO, CUSTNAME, USERNAME, PASSWORD, METHOD,
  } = payload as Record<string, string>;

  if (!validateCredentials(USERNAME, PASSWORD)) {
    return buildResponse({ ERR: '55', METHOD: 'PAYMENT' }, 200, debug);
  }

  if (String(METHOD ?? '').trim() !== 'PAYMENT') {
    return pay30(debug, 'method_not_payment');
  }

  const parsed = parseVANO(String(VANO ?? ''));
  if (!parsed) {
    return pay30(debug, 'vano_invalid_not_16_digits');
  }

  const vanoNorm = String(VANO ?? '').replace(/\D/g, '');
  const refNo = String(REFNO ?? '').trim();
  const trxDate = String(TRXDATE ?? '').trim();

  if (!refNo || !trxDate) {
    return pay30(debug, 'refno_or_trxdate_empty');
  }

  const billScaled = parseScaledAmount(BILL);
  const paymentScaled = parseScaledAmount(PAYMENT);
  if (billScaled == null || paymentScaled == null) {
    return pay30(debug, 'bill_or_payment_unparseable');
  }

  const headRows = (await sql`
    SELECT
      t.id,
      t.created_at,
      t.user_id,
      (t.total_amount)::float8 AS total_amount,
      t.status,
      t.reference_no,
      t.payment_method_id,
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
    id: number;
    created_at: string;
    user_id: number;
    total_amount: number;
    status: string | null;
    reference_no: string;
    payment_method_id: number | null;
    student_id: number | null;
    student_name: string | null;
    academic_year_name: string | null;
  }[];

  if (headRows.length === 0) {
    return pay30(debug, 'transaction_not_found_for_va');
  }

  const head = headRows[0];
  const st = String(head.status ?? '').toLowerCase();

  if (st === 'success') {
    return buildResponse({ ERR: '88', METHOD: 'PAYMENT' }, 200, debug);
  }

  if (st !== 'pending') {
    return pay30(debug, `transaction_status_not_pending:${st}`);
  }

  if (head.student_id == null) {
    return pay30(debug, 'student_id_null_on_transaction');
  }
  const nameGate = String(head.student_name ?? CUSTNAME ?? '').trim();
  if (!nameGate || !formatCustomerName(nameGate)) {
    return pay30(debug, 'customer_name_missing_join_core_students_or_invalid_custname');
  }

  const totalDb = num(head.total_amount);
  if (Math.abs(billScaled - totalDb) > 0.02) {
    return pay30(debug, `bill_amount_mismatch_db_${totalDb}_payload_${billScaled}`);
  }

  const claim = await tryClaimBmiPaymentKey(vanoNorm, refNo, trxDate);
  if (claim === 'duplicate') {
    return pay30(debug, 'duplicate_vano_refno_trxdate');
  }
  if (claim === 'error') {
    return buildResponse({ ERR: '12', METHOD: 'PAYMENT' }, 200, debug);
  }

  const tid = Number(head.id);

  /** Jangan kirim `String(Date)` ke Postgres (format `GMT+0700` ditolak). Pakai subquery `created_at` kanonik dari baris terbaru. */
  const detailRows = (await sql`
    SELECT
      d.bill_id AS "bill_id",
      (d.amount_paid)::float8 AS amount_paid,
      COALESCE(p.is_installment, false) AS is_installment,
      lower(trim(coalesce(p.payment_type, ''))) AS payment_type,
      (b.total_amount)::float8 AS bill_total,
      (b.paid_amount)::float8 AS bill_paid,
      (b.min_payment)::float8 AS bill_min
    FROM tuition_transaction_details d
    INNER JOIN tuition_bills b ON b.id = d.bill_id
    INNER JOIN tuition_products p ON p.id = d.product_id
    WHERE d.transaction_id = ${tid}
      AND d.transaction_created_at = (
        SELECT created_at
        FROM tuition_transactions
        WHERE id = ${tid}
        ORDER BY created_at DESC
        LIMIT 1
      )
    ORDER BY d.id ASC
  `) as unknown as DetailRow[];

  if (detailRows.length === 0) {
    await releaseBmiPaymentKey(vanoNorm, refNo, trxDate);
    return pay30(
      debug,
      'no_transaction_details_or_bill_product_join_failed_check_bill_id_product_id',
    );
  }

  const mode = classifyPaymentMode(detailRows);
  const remMap = billRemainingMap(detailRows);
  const maxApply = sumRemaining(remMap);

  let effectivePayment = paymentScaled;
  if (mode === 'OPEN') {
    effectivePayment = round2(Math.min(Math.max(paymentScaled, 0), maxApply));
  } else if (mode === 'PARTIAL') {
    if (paymentScaled - totalDb > 0.005) {
      await releaseBmiPaymentKey(vanoNorm, refNo, trxDate);
      return buildResponse({ ERR: '13', METHOD: 'PAYMENT' }, 200, debug);
    }
    let floor = 0;
    for (const d of detailRows) {
      if (d.is_installment) floor = Math.max(floor, num(d.bill_min));
    }
    if (floor > 0 && paymentScaled + 0.005 < floor) {
      await releaseBmiPaymentKey(vanoNorm, refNo, trxDate);
      return buildResponse({ ERR: '13', METHOD: 'PAYMENT' }, 200, debug);
    }
    effectivePayment = round2(Math.min(paymentScaled, maxApply));
  } else {
    if (Math.abs(paymentScaled - totalDb) > 0.02) {
      await releaseBmiPaymentKey(vanoNorm, refNo, trxDate);
      return buildResponse({ ERR: '16', METHOD: 'PAYMENT' }, 200, debug);
    }
    effectivePayment = round2(Math.min(paymentScaled, maxApply));
  }

  if (effectivePayment <= 0) {
    await releaseBmiPaymentKey(vanoNorm, refNo, trxDate);
    return pay30(
      debug,
      `effective_payment_zero_or_negative_mode_${mode}_maxApply_${maxApply}_paymentScaled_${paymentScaled}`,
    );
  }

  const byBill = allocateByBill(detailRows, effectivePayment, remMap);

  try {
    for (const [billId, addRaw] of byBill.entries()) {
      const add = round2(addRaw);
      if (add <= 0) continue;

      const br = (await sql`
        SELECT
          (b.total_amount)::float8 AS total_amount,
          (b.paid_amount)::float8 AS paid_amount,
          COALESCE(p.is_installment, false) AS is_installment
        FROM tuition_bills b
        INNER JOIN tuition_products p ON p.id = b.product_id
        WHERE b.id = ${billId}
        LIMIT 1
      `) as unknown as { total_amount: number; paid_amount: number; is_installment: boolean }[];

      if (br.length === 0) throw new Error('bill_missing');

      const b = br[0];
      const newPaid = round2(num(b.paid_amount) + add);
      const status = nextBillStatus({
        billTotal: num(b.total_amount),
        newPaid,
      });

      await sql`
        UPDATE tuition_bills
        SET
          paid_amount = (paid_amount::numeric + ${add}::numeric)::numeric(15,2),
          status = ${status},
          updated_at = now()
        WHERE id = ${billId}
      `;
    }

    await sql`
      UPDATE tuition_transactions
      SET
        status = 'success',
        payment_date = now()
      WHERE id = ${tid}
        AND created_at = (
          SELECT created_at
          FROM tuition_transactions
          WHERE id = ${tid}
          ORDER BY created_at DESC
          LIMIT 1
        )
    `;
  } catch (e) {
    console.error('bmi_va_payment_db', e);
    await releaseBmiPaymentKey(vanoNorm, refNo, trxDate);
    return buildResponse({ ERR: '12', METHOD: 'PAYMENT' }, 200, debug);
  }

  void schedulePaymentSuccessWhatsAppJob({
    transactionId: String(tid),
    userId: Number(head.user_id),
    channelId: String(CHANNELID ?? '').trim() || undefined,
  }).catch((err) => {
    console.error('bmi_va_payment_schedule_wa', err);
  });

  const billOut = String(Math.max(0, Math.round(totalDb * 100)));
  const cust = formatCustomerName(String(head.student_name ?? CUSTNAME ?? ''));
  const desc2 = String(head.academic_year_name ?? '').slice(0, 256);

  return buildResponse({
    CCY: CCY ?? '360',
    BILL: billOut,
    CUSTNAME: cust || formatCustomerName('SISWA'),
    DESCRIPTION: 'TUITION',
    DESCRIPTION2: desc2,
    ERR: '00',
    METHOD: 'PAYMENT',
  }, 200, debug);
}
