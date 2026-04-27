/**
 * Portal finance (GET): data berasal dari view `v_portal_finance_bills` dan
 * `v_portal_tuition_payment_lines` (lihat sql/portal_finance_views.sql).
 *
 * Kolom opsional di Neon produksi (sinkron dengan refs/kgs_scheme.sql):
 * tuition_bills.school_id, cohort_id, discount_amount, notes;
 * tuition_products.is_installment — diekspos view sebagai is_installment;
 * jika discount_amount ada, sesuaikan definisi view di DB (GREATEST(total - paid - discount, 0)).
 */
import {
  FINANCE_MONTH_GRID,
  type FinanceChildPayload,
  type FinanceInstallmentRow,
  type FinanceMonthSlot,
  type FinancePreviousBillRow,
} from '@/lib/data/portal-finance-payload';
import type { PortalChildRow } from '@/lib/data/server/children';
import { sql } from '@/lib/db/client';

export type { FinanceChildPayload, FinanceInstallmentRow, FinanceMonthSlot, FinancePreviousBillRow } from '@/lib/data/portal-finance-payload';

/** Hanya student_id yang boleh di-query tagihan (parent / student), tidak percaya array dari client semata. */
async function getStudentIdsAccessibleToViewer(userId: number, role: string): Promise<number[]> {
  if (role === 'parent') {
    const rows = await sql`
      SELECT s.id AS "studentId"
      FROM core_parent_student_relations r
      INNER JOIN core_students s ON s.id = r.student_id
      WHERE r.user_id = ${userId}
        AND s.enrollment_status = 'active'
    `;
    return (rows as unknown as { studentId: number }[]).map((r) => r.studentId);
  }
  const rows = await sql`
    SELECT s.id AS "studentId"
    FROM core_students s
    WHERE s.user_id = ${userId}
      AND s.enrollment_status = 'active'
  `;
  return (rows as unknown as { studentId: number }[]).map((r) => r.studentId);
}

type BillViewRow = {
  bill_id: number;
  student_id: number;
  academic_year_id: number;
  academic_year_name: string;
  product_id: number;
  product_name: string;
  payment_type: string;
  is_installment: boolean;
  title: string;
  total_amount: string | number;
  paid_amount: string | number;
  min_payment: string | number;
  balance_amount: string | number;
  is_fully_paid: boolean;
  bill_month: number | null;
  bill_year: number | null;
  related_month: string | null;
};

type PaymentLineRow = {
  bill_id: number;
  amount_paid: string;
  detail_created_at: string;
  payment_date: string | null;
};

function parseAcademicYearRange(name: string): { yStart: number; yEnd: number } | null {
  const m = name.trim().match(/^(\d{4})\s*\/\s*(\d{4})$/);
  if (!m) return null;
  const yStart = Number(m[1]);
  const yEnd = Number(m[2]);
  if (!Number.isFinite(yStart) || !Number.isFinite(yEnd)) return null;
  return { yStart, yEnd };
}

/** Slot 0 = July of yStart, … 11 = June of yEnd (Indonesian-style AY). */
function calendarForSlot(slot: number, ay: { yStart: number; yEnd: number }): { y: number; m: number } {
  if (slot < 6) return { y: ay.yStart, m: slot + 7 };
  return { y: ay.yEnd, m: slot - 5 };
}

function billMatchesSlot(
  row: BillViewRow,
  slot: number,
  ay: { yStart: number; yEnd: number },
): boolean {
  const { y, m } = calendarForSlot(slot, ay);
  if (row.related_month) {
    const d = new Date(row.related_month);
    if (!Number.isNaN(d.getTime())) return d.getFullYear() === y && d.getMonth() + 1 === m;
  }
  if (row.bill_year != null && row.bill_month != null) {
    return row.bill_year === y && row.bill_month === m;
  }
  return false;
}

function num(v: string | number | null | undefined): number {
  if (v == null) return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v === 'bigint') return Number(v);
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Angka uang dari baris DB (Neon/JSON kadang string, bigint, atau key camelCase). */
function numMoney(row: Record<string, unknown>, snake: string, camel: string): number {
  const raw = row[snake] ?? row[camel];
  if (raw == null) return 0;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0;
  if (typeof raw === 'bigint') return Number(raw);
  if (typeof raw === 'string') {
    const t = raw.trim().replace(/\s/g, '');
    const n = Number(t);
    return Number.isFinite(n) ? n : 0;
  }
  if (typeof raw === 'object' && raw !== null && 'toString' in raw) {
    const n = Number(String(raw));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function coalescePgBool(v: unknown): boolean {
  return v === true || v === 't' || v === 'true' || v === 1 || v === '1';
}

/**
 * Tagihan non-bulanan yang boleh tampil di blok cicilan/DSP/DKT:
 * utama `tuition_products.is_installment`; fallback `payment_type = 'installment'` untuk seed/data lama.
 * `monthly` tetap hanya di kartu SPP 12 bulan.
 */
function rowIsInstallmentBillRow(r: BillViewRow): boolean {
  if (r.payment_type === 'monthly') return false;
  if (coalescePgBool(r.is_installment)) return true;
  return r.payment_type === 'installment';
}

async function fetchBillsForStudents(studentIds: number[]): Promise<BillViewRow[]> {
  if (studentIds.length === 0) return [];
  const chunks = await Promise.all(
    studentIds.map((studentId) =>
      sql`
        SELECT
          bill_id,
          student_id,
          academic_year_id,
          academic_year_name,
          product_id,
          product_name,
          payment_type,
          title,
          (total_amount)::float8 AS total_amount,
          (paid_amount)::float8 AS paid_amount,
          (min_payment)::float8 AS min_payment,
          (balance_amount)::float8 AS balance_amount,
          is_fully_paid,
          bill_month,
          bill_year,
          related_month,
          is_installment
        FROM v_portal_finance_bills
        WHERE student_id = ${studentId}
      `,
    ),
  );
  return (chunks.flat() as unknown as Record<string, unknown>[]).map((raw) => {
    const base = raw as BillViewRow;
    return {
      ...base,
      total_amount: numMoney(raw, 'total_amount', 'totalAmount') as BillViewRow['total_amount'],
      paid_amount: numMoney(raw, 'paid_amount', 'paidAmount') as BillViewRow['paid_amount'],
      min_payment: numMoney(raw, 'min_payment', 'minPayment') as BillViewRow['min_payment'],
      balance_amount: numMoney(raw, 'balance_amount', 'balanceAmount') as BillViewRow['balance_amount'],
    };
  });
}

async function fetchPaymentLinesForBillIds(billIds: number[]): Promise<PaymentLineRow[]> {
  if (billIds.length === 0) return [];
  const chunks = await Promise.all(
    billIds.map((billId) =>
      sql`
        SELECT
          bill_id,
          amount_paid,
          detail_created_at,
          payment_date
        FROM v_portal_tuition_payment_lines
        WHERE bill_id = ${billId}
        ORDER BY detail_created_at ASC
      `,
    ),
  );
  return chunks.flat() as unknown as PaymentLineRow[];
}

function buildChildPayload(
  child: PortalChildRow,
  rows: BillViewRow[],
  paymentLinesByBillId: Map<number, PaymentLineRow[]>,
): FinanceChildPayload {
  const activeAyId = child.academicYearId;
  const monthlyCurrent = rows.filter(
    (r) =>
      r.student_id === child.id &&
      r.payment_type === 'monthly' &&
      activeAyId != null &&
      r.academic_year_id === activeAyId,
  );
  const ayName =
    monthlyCurrent[0]?.academic_year_name ??
    rows.find((r) => r.student_id === child.id && r.academic_year_id === activeAyId)?.academic_year_name ??
    null;
  const ayRange = ayName ? parseAcademicYearRange(ayName) : null;

  const months: FinanceMonthSlot[] = FINANCE_MONTH_GRID.map((meta, slot) => ({
    ...meta,
    calendarYear: ayRange ? calendarForSlot(slot, ayRange).y : null,
    amount: 0,
    status: 'unpaid' as const,
    billId: null,
  }));

  if (ayRange) {
    for (let slot = 0; slot < 12; slot += 1) {
      const candidates = monthlyCurrent.filter((r) => billMatchesSlot(r, slot, ayRange));
      if (candidates.length === 0) continue;
      const chosen = candidates.sort((a, b) => num(b.balance_amount) - num(a.balance_amount))[0];
      const balance = num(chosen.balance_amount);
      const total = num(chosen.total_amount);
      const y = calendarForSlot(slot, ayRange).y;
      months[slot] = {
        ...FINANCE_MONTH_GRID[slot],
        calendarYear: y,
        amount: chosen.is_fully_paid ? total : balance > 0 ? balance : total,
        status: chosen.is_fully_paid ? 'paid' : 'unpaid',
        billId: String(chosen.bill_id),
      };
    }
  }

  const previous: FinancePreviousBillRow[] = [];
  if (activeAyId != null) {
    for (const r of rows) {
      if (r.student_id !== child.id) continue;
      if (r.academic_year_id === activeAyId) continue;
      const bal = num(r.balance_amount);
      if (bal <= 0) continue;
      previous.push({
        id: String(r.bill_id),
        ay: r.academic_year_name,
        titleEn: r.title,
        titleId: r.title,
        amount: bal,
      });
    }
  }

  const installments: FinanceInstallmentRow[] = [];
  if (activeAyId != null) {
    const instRows = rows.filter(
      (r) => r.student_id === child.id && r.academic_year_id === activeAyId && rowIsInstallmentBillRow(r),
    );
    for (const r of instRows) {
      const lines = paymentLinesByBillId.get(r.bill_id) ?? [];
      const paymentHistory = lines.map((ln) => ({
        date: (ln.payment_date ?? ln.detail_created_at).slice(0, 10),
        amount: num(ln.amount_paid),
      }));
      const minP = num(r.min_payment);
      const totalAmt = num(r.total_amount);
      const paidAmt = num(r.paid_amount);
      const fully =
        coalescePgBool(r.is_fully_paid) || (totalAmt > 0 && paidAmt >= totalAmt);
      installments.push({
        id: String(r.bill_id),
        nameEn: r.product_name,
        nameId: r.product_name,
        total: totalAmt,
        paid: paidAmt,
        minPayment: minP > 0 ? minP : 0,
        isFullyPaid: fully,
        paymentHistory,
      });
    }
  }

  return {
    academicYearLabel: ayName,
    months,
    previous,
    installments,
  };
}

/** Dashboard keuangan per anak (RSC). Memverifikasi ulang akses viewer → siswa di DB. */
export async function getFinanceDashboardForPortal(
  viewerUserId: number,
  viewerRole: string,
  children: PortalChildRow[],
): Promise<Record<number, FinanceChildPayload>> {
  const out: Record<number, FinanceChildPayload> = {};
  if (children.length === 0) return out;

  const allowed = new Set(await getStudentIdsAccessibleToViewer(viewerUserId, viewerRole));
  const safeChildren = children.filter((c) => allowed.has(c.id));
  if (safeChildren.length === 0) return out;

  const studentIds = safeChildren.map((c) => c.id);
  const allRows = await fetchBillsForStudents(studentIds);

  const installmentBillIds = allRows.filter((r) => rowIsInstallmentBillRow(r)).map((r) => r.bill_id);
  const uniqueBillIds = [...new Set(installmentBillIds)];
  const lineRows = await fetchPaymentLinesForBillIds(uniqueBillIds);
  const paymentLinesByBillId = new Map<number, PaymentLineRow[]>();
  for (const ln of lineRows) {
    const list = paymentLinesByBillId.get(ln.bill_id) ?? [];
    list.push(ln);
    paymentLinesByBillId.set(ln.bill_id, list);
  }

  for (const child of safeChildren) {
    out[child.id] = buildChildPayload(child, allRows, paymentLinesByBillId);
  }
  return out;
}
