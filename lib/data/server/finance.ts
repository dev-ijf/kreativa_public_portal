/**
 * Portal finance (GET): data berasal dari view `v_portal_finance_bills` dan
 * `v_portal_tuition_payment_lines` (lihat sql/portal_finance_views.sql).
 *
 * Kolom opsional di Neon produksi (sinkron dengan refs/kgs_scheme.sql):
 * tuition_bills.school_id, cohort_id, discount_amount, notes;
 * tuition_products.is_installment — view saat ini memakai kolom inti refs;
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
  title: string;
  total_amount: string;
  paid_amount: string;
  min_payment: string;
  balance_amount: string;
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
  if (typeof v === 'number') return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
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
          total_amount,
          paid_amount,
          min_payment,
          balance_amount,
          is_fully_paid,
          bill_month,
          bill_year,
          related_month
        FROM v_portal_finance_bills
        WHERE student_id = ${studentId}
      `,
    ),
  );
  return chunks.flat() as unknown as BillViewRow[];
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

  const months: FinanceMonthSlot[] = FINANCE_MONTH_GRID.map((meta) => ({
    ...meta,
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
      months[slot] = {
        ...FINANCE_MONTH_GRID[slot],
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
      (r) => r.student_id === child.id && r.academic_year_id === activeAyId && r.payment_type === 'installment',
    );
    for (const r of instRows) {
      const lines = paymentLinesByBillId.get(r.bill_id) ?? [];
      const paymentHistory = lines.map((ln) => ({
        date: (ln.payment_date ?? ln.detail_created_at).slice(0, 10),
        amount: num(ln.amount_paid),
      }));
      const minP = num(r.min_payment);
      installments.push({
        id: String(r.bill_id),
        nameEn: r.product_name,
        nameId: r.product_name,
        total: num(r.total_amount),
        paid: num(r.paid_amount),
        minPayment: minP > 0 ? minP : 0,
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

  const installmentBillIds = allRows
    .filter((r) => r.payment_type === 'installment')
    .map((r) => r.bill_id);
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
