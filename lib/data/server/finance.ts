import { cache } from 'react';

/**
 * Portal finance (GET): data dari `v_portal_finance_bills`,
 * `v_portal_finance_bill_groups`, `v_portal_tuition_payment_lines`
 * (lihat sql/portal_finance_views.sql).
 *
 * billingMode:
 * - talenta (theme_id ≠ 1): kartu 12 bulan + cicilan open-amount dari tuition_bills
 * - kreativa (theme_id = 1): kartu tagihan by title + donut dari tuition_bill_groups
 */
import {
  FINANCE_MONTH_GRID,
  emptyFinanceChildPayload,
  type FinanceBillingMode,
  type FinanceChildPayload,
  type FinanceInstallmentGroupRow,
  type FinanceInstallmentRow,
  type FinanceMonthSlot,
  type FinancePayableBillSlot,
  type FinancePreviousBillRow,
} from '@/lib/data/portal-finance-payload';
import type { PortalChildRow } from '@/lib/data/server/children';
import { sql } from '@/lib/db/client';

export type {
  FinanceBillingMode,
  FinanceChildPayload,
  FinanceInstallmentGroupRow,
  FinanceInstallmentRow,
  FinanceMonthSlot,
  FinancePayableBillSlot,
  FinancePreviousBillRow,
} from '@/lib/data/portal-finance-payload';

/** Hanya student_id yang boleh di-query tagihan (parent / student), tidak percaya array dari client semata. */
async function loadStudentIdsAccessibleToViewer(userId: number, role: string): Promise<number[]> {
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

/** Satu query per request untuk user+role (dedup lintas finance + payment-methods). */
export const getStudentIdsAccessibleToViewer = cache(loadStudentIdsAccessibleToViewer);

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
  bill_created_at: string | null;
  due_date: string | null;
  bill_group_id: number | null;
  termin_sequence: number | null;
};

type BillGroupViewRow = {
  bill_group_id: number;
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
  net_total_amount: string | number;
  balance_amount: string | number;
  is_fully_paid: boolean;
  termin_count: number | null;
  due_date: string | null;
};

type PaymentLineRow = {
  bill_id: number;
  amount_paid: string;
  detail_created_at: string;
  payment_date: string | null;
  transaction_id: string | number;
  transaction_created_at: string;
  reference_no: string | null;
  transaction_status: string | null;
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

function num(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v === 'bigint') return Number(v);
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
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

function billingModeFromThemeId(themeId: number | null | undefined): FinanceBillingMode {
  return themeId === 1 ? 'kreativa' : 'talenta';
}

/**
 * Tagihan non-bulanan yang boleh tampil di blok cicilan/DSP/DKT (Talenta):
 * utama `tuition_products.is_installment`; fallback `payment_type = 'installment'` untuk seed/data lama.
 * `monthly` tetap hanya di kartu SPP 12 bulan.
 */
function rowIsInstallmentBillRow(r: BillViewRow): boolean {
  if (r.payment_type === 'monthly') return false;
  if (coalescePgBool(r.is_installment)) return true;
  return r.payment_type === 'installment';
}

function mapBillViewRows(rows: Record<string, unknown>[]): BillViewRow[] {
  return rows.map((raw) => {
    const base = raw as BillViewRow;
    return {
      ...base,
      total_amount: numMoney(raw, 'total_amount', 'totalAmount') as BillViewRow['total_amount'],
      paid_amount: numMoney(raw, 'paid_amount', 'paidAmount') as BillViewRow['paid_amount'],
      min_payment: numMoney(raw, 'min_payment', 'minPayment') as BillViewRow['min_payment'],
      balance_amount: numMoney(raw, 'balance_amount', 'balanceAmount') as BillViewRow['balance_amount'],
      bill_group_id:
        raw.bill_group_id != null || raw.billGroupId != null
          ? num(raw.bill_group_id ?? raw.billGroupId)
          : null,
      termin_sequence:
        raw.termin_sequence != null || raw.terminSequence != null
          ? num(raw.termin_sequence ?? raw.terminSequence)
          : null,
    };
  });
}

async function fetchBillsForStudents(studentIds: number[]): Promise<BillViewRow[]> {
  const unique = [...new Set(studentIds)].filter((n) => Number.isFinite(n) && n > 0);
  if (unique.length === 0) return [];
  try {
    const rows = await sql`
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
        bill_created_at,
        due_date,
        is_installment,
        bill_group_id,
        termin_sequence
      FROM v_portal_finance_bills
      WHERE student_id = ANY(${unique}::int[])
      ORDER BY student_id ASC, bill_id ASC
    `;
    return mapBillViewRows(rows as unknown as Record<string, unknown>[]);
  } catch {
    // View lama tanpa kolom bill_group — fallback Talenta-compatible.
    const rows = await sql`
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
        bill_created_at,
        due_date,
        is_installment
      FROM v_portal_finance_bills
      WHERE student_id = ANY(${unique}::int[])
      ORDER BY student_id ASC, bill_id ASC
    `;
    return mapBillViewRows(rows as unknown as Record<string, unknown>[]);
  }
}

async function fetchBillGroupsForStudents(studentIds: number[]): Promise<BillGroupViewRow[]> {
  const unique = [...new Set(studentIds)].filter((n) => Number.isFinite(n) && n > 0);
  if (unique.length === 0) return [];
  try {
    const rows = await sql`
      SELECT
        bill_group_id,
        student_id,
        academic_year_id,
        academic_year_name,
        product_id,
        product_name,
        payment_type,
        is_installment,
        title,
        (total_amount)::float8 AS total_amount,
        (paid_amount)::float8 AS paid_amount,
        (net_total_amount)::float8 AS net_total_amount,
        (balance_amount)::float8 AS balance_amount,
        is_fully_paid,
        termin_count,
        due_date
      FROM v_portal_finance_bill_groups
      WHERE student_id = ANY(${unique}::int[])
      ORDER BY student_id ASC, bill_group_id ASC
    `;
    return (rows as unknown as Record<string, unknown>[]).map((raw) => {
      const base = raw as BillGroupViewRow;
      return {
        ...base,
        bill_group_id: num(raw.bill_group_id ?? raw.billGroupId),
        total_amount: numMoney(raw, 'total_amount', 'totalAmount'),
        paid_amount: numMoney(raw, 'paid_amount', 'paidAmount'),
        net_total_amount: numMoney(raw, 'net_total_amount', 'netTotalAmount'),
        balance_amount: numMoney(raw, 'balance_amount', 'balanceAmount'),
        termin_count:
          raw.termin_count != null || raw.terminCount != null
            ? num(raw.termin_count ?? raw.terminCount)
            : null,
      };
    });
  } catch {
    // View belum di-deploy di lingkungan lama — Kreativa groups kosong.
    return [];
  }
}

async function fetchPaymentLinesForBillIds(billIds: number[]): Promise<PaymentLineRow[]> {
  if (billIds.length === 0) return [];
  const rows = await sql`
    SELECT
      bill_id,
      amount_paid,
      detail_created_at,
      payment_date,
      transaction_id,
      transaction_created_at,
      reference_no,
      transaction_status
    FROM v_portal_tuition_payment_lines
    WHERE bill_id = ANY(${billIds}::int[])
    ORDER BY bill_id, detail_created_at ASC
  `;
  return rows as unknown as PaymentLineRow[];
}

function mapPaymentLines(lines: PaymentLineRow[]) {
  return lines.map((ln) => {
    const createdAt =
      typeof ln.transaction_created_at === 'string'
        ? ln.transaction_created_at
        : ln.transaction_created_at != null
          ? String(ln.transaction_created_at)
          : '';
    return {
      date: (ln.payment_date ?? ln.detail_created_at).slice(0, 10),
      amount: num(ln.amount_paid),
      transactionId: String(ln.transaction_id),
      transactionCreatedAt: createdAt,
      referenceNo: ln.reference_no ?? null,
      transactionStatus: ln.transaction_status ?? null,
    };
  });
}

function buildPreviousBills(child: PortalChildRow, rows: BillViewRow[]): FinancePreviousBillRow[] {
  const activeAyId = child.academicYearId;
  const previousCandidates: { row: BillViewRow; amount: number }[] = [];
  if (activeAyId != null) {
    for (const r of rows) {
      if (r.student_id !== child.id) continue;
      if (r.academic_year_id === activeAyId) continue;
      const bal = num(r.balance_amount);
      if (bal <= 0) continue;
      previousCandidates.push({ row: r, amount: bal });
    }
  }
  function pastDueSortKey(r: BillViewRow): number {
    const raw = r.bill_created_at ?? r.due_date;
    if (raw == null) return 0;
    const t = new Date(raw).getTime();
    return Number.isFinite(t) ? t : 0;
  }
  previousCandidates.sort((a, b) => pastDueSortKey(b.row) - pastDueSortKey(a.row));
  return previousCandidates.map(({ row: r, amount: bal }) => ({
    id: String(r.bill_id),
    ay: r.academic_year_name,
    titleEn: r.title,
    titleId: r.title,
    amount: bal,
  }));
}

function resolveAyName(child: PortalChildRow, rows: BillViewRow[], groups: BillGroupViewRow[]): string | null {
  const activeAyId = child.academicYearId;
  if (activeAyId == null) return null;
  return (
    rows.find((r) => r.student_id === child.id && r.academic_year_id === activeAyId)?.academic_year_name ??
    groups.find((g) => g.student_id === child.id && g.academic_year_id === activeAyId)?.academic_year_name ??
    null
  );
}

function buildTalentaPayload(
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
  const ayName = resolveAyName(child, rows, []);
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
        status: coalescePgBool(chosen.is_fully_paid) ? 'paid' : 'unpaid',
        billId: String(chosen.bill_id),
      };
    }
  }

  const previous = buildPreviousBills(child, rows);

  const installments: FinanceInstallmentRow[] = [];
  if (activeAyId != null) {
    const instRows = rows.filter(
      (r) => r.student_id === child.id && r.academic_year_id === activeAyId && rowIsInstallmentBillRow(r),
    );
    for (const r of instRows) {
      const lines = paymentLinesByBillId.get(r.bill_id) ?? [];
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
        paymentHistory: mapPaymentLines(lines),
      });
    }
  }

  return {
    billingMode: 'talenta',
    academicYearLabel: ayName,
    months,
    payableBills: [],
    previous,
    installments,
    installmentGroups: [],
  };
}

function buildKreativaPayload(
  child: PortalChildRow,
  rows: BillViewRow[],
  groups: BillGroupViewRow[],
  paymentLinesByBillId: Map<number, PaymentLineRow[]>,
): FinanceChildPayload {
  const activeAyId = child.academicYearId;
  const ayName = resolveAyName(child, rows, groups);
  const emptyMonths: FinanceMonthSlot[] = FINANCE_MONTH_GRID.map((meta) => ({
    ...meta,
    calendarYear: null,
    amount: 0,
    status: 'unpaid' as const,
    billId: null,
  }));

  const previous = buildPreviousBills(child, rows);
  const installmentGroups: FinanceInstallmentGroupRow[] = [];
  const coveredBillIds = new Set<number>();

  if (activeAyId != null) {
    // Semua bill_group current AY (satu kartu per fee: DSP / DKT / SPP / Pendaftaran).
    const childGroups = groups
      .filter((g) => g.student_id === child.id && g.academic_year_id === activeAyId)
      .sort((a, b) => {
        const da = a.due_date ? new Date(a.due_date).getTime() : Number.POSITIVE_INFINITY;
        const db = b.due_date ? new Date(b.due_date).getTime() : Number.POSITIVE_INFINITY;
        if (da !== db) return da - db;
        return a.bill_group_id - b.bill_group_id;
      });

    for (const g of childGroups) {
      const groupBills = rows.filter(
        (r) => r.student_id === child.id && num(r.bill_group_id) === g.bill_group_id,
      );
      for (const r of groupBills) coveredBillIds.add(r.bill_id);

      const lines: PaymentLineRow[] = [];
      for (const r of groupBills) {
        const list = paymentLinesByBillId.get(r.bill_id);
        if (list) lines.push(...list);
      }
      lines.sort((a, b) => String(a.detail_created_at).localeCompare(String(b.detail_created_at)));

      const unpaidTermins = groupBills
        .filter((r) => num(r.balance_amount) > 0 && !coalescePgBool(r.is_fully_paid))
        .sort((a, b) => num(a.termin_sequence) - num(b.termin_sequence) || a.bill_id - b.bill_id)
        .map((r) => ({
          billId: String(r.bill_id),
          title: r.title,
          amount: num(r.balance_amount),
        }));

      const netTotal = num(g.net_total_amount);
      const paidAmt = num(g.paid_amount);
      const fully = coalescePgBool(g.is_fully_paid) || (netTotal > 0 && paidAmt >= netTotal);

      installmentGroups.push({
        id: String(g.bill_group_id),
        nameEn: g.title || g.product_name,
        nameId: g.title || g.product_name,
        total: netTotal > 0 ? netTotal : num(g.total_amount),
        paid: paidAmt,
        isFullyPaid: fully,
        termins: unpaidTermins,
        paymentHistory: mapPaymentLines(lines),
      });
    }

    // Tagihan current AY tanpa bill_group (orphan) — satu "group" per bill.
    const orphans = rows
      .filter(
        (r) =>
          r.student_id === child.id &&
          r.academic_year_id === activeAyId &&
          !coveredBillIds.has(r.bill_id) &&
          (r.bill_group_id == null || num(r.bill_group_id) <= 0),
      )
      .sort((a, b) => a.bill_id - b.bill_id);

    for (const r of orphans) {
      const bal = num(r.balance_amount);
      const totalAmt = num(r.total_amount);
      const paidAmt = num(r.paid_amount);
      const fully = coalescePgBool(r.is_fully_paid) || bal <= 0;
      const lines = paymentLinesByBillId.get(r.bill_id) ?? [];
      installmentGroups.push({
        id: `bill-${r.bill_id}`,
        nameEn: r.title || r.product_name,
        nameId: r.title || r.product_name,
        total: totalAmt,
        paid: paidAmt,
        isFullyPaid: fully,
        termins:
          !fully && bal > 0
            ? [{ billId: String(r.bill_id), title: r.title, amount: bal }]
            : [],
        paymentHistory: mapPaymentLines(lines),
      });
    }
  }

  // Outstanding helper: unique unpaid termin balances (tanpa digital card).
  const payableBills: FinancePayableBillSlot[] = [];
  const seen = new Set<string>();
  for (const g of installmentGroups) {
    for (const t of g.termins) {
      if (seen.has(t.billId)) continue;
      seen.add(t.billId);
      payableBills.push({ billId: t.billId, title: t.title, amount: t.amount });
    }
  }

  return {
    billingMode: 'kreativa',
    academicYearLabel: ayName,
    months: emptyMonths,
    payableBills,
    previous,
    installments: [],
    installmentGroups,
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
  const hasKreativa = safeChildren.some((c) => billingModeFromThemeId(c.themeId) === 'kreativa');

  const allRows = await fetchBillsForStudents(studentIds);
  const allGroups = hasKreativa ? await fetchBillGroupsForStudents(studentIds) : [];

  const paymentBillIds = new Set<number>();
  for (const r of allRows) {
    if (rowIsInstallmentBillRow(r)) paymentBillIds.add(r.bill_id);
    if (r.bill_group_id != null) paymentBillIds.add(r.bill_id);
  }
  const lineRows = await fetchPaymentLinesForBillIds([...paymentBillIds]);
  const paymentLinesByBillId = new Map<number, PaymentLineRow[]>();
  for (const ln of lineRows) {
    const list = paymentLinesByBillId.get(ln.bill_id) ?? [];
    list.push(ln);
    paymentLinesByBillId.set(ln.bill_id, list);
  }

  for (const child of safeChildren) {
    const mode = billingModeFromThemeId(child.themeId);
    out[child.id] =
      mode === 'kreativa'
        ? buildKreativaPayload(child, allRows, allGroups, paymentLinesByBillId)
        : buildTalentaPayload(child, allRows, paymentLinesByBillId);
  }

  // Pastikan setiap anak punya shape penuh (hindari undefined di client).
  for (const child of safeChildren) {
    if (!out[child.id]) out[child.id] = emptyFinanceChildPayload();
  }

  return out;
}
