/**
 * Tipe + helper UI finance portal — aman untuk `"use client"` (tanpa import DB).
 */

export type FinanceBillingMode = 'kreativa' | 'talenta';

export type FinanceMonthSlot = {
  monthKey: string;
  monthLabelEn: string;
  monthLabelId: string;
  /** Tahun kalender untuk slot Jul–Jun (mis. AY 2025/2026 → Jul–Des 2025, Jan–Jun 2026). */
  calendarYear: number | null;
  amount: number;
  status: 'paid' | 'unpaid';
  billId: string | null;
};

/** Kreativa: kotak kartu tagihan (bukan bulan). */
export type FinancePayableBillSlot = {
  billId: string;
  title: string;
  amount: number;
};

export type FinanceInstallmentPaymentLine = {
  date: string;
  amount: number;
  transactionId: string;
  transactionCreatedAt: string;
  referenceNo: string | null;
  transactionStatus: string | null;
};

export type FinanceInstallmentRow = {
  id: string;
  nameEn: string;
  nameId: string;
  total: number;
  paid: number;
  minPayment: number;
  /** Dari tagihan DB: lunas → gauge 100%, tanpa input / add to cart. */
  isFullyPaid: boolean;
  paymentHistory: FinanceInstallmentPaymentLine[];
};

/** Kreativa: termin unpaid di bawah bill group (toggle full amount). */
export type FinanceInstallmentTermin = {
  billId: string;
  title: string;
  amount: number;
};

/** Kreativa: group dari tuition_bill_groups (+ orphan bills). Donut hanya jika isInstallment. */
export type FinanceInstallmentGroupRow = {
  id: string;
  nameEn: string;
  nameId: string;
  total: number;
  paid: number;
  isFullyPaid: boolean;
  /** Dari tuition_products.is_installment — false → UI tanpa donut (mis. Pendaftaran). */
  isInstallment: boolean;
  termins: FinanceInstallmentTermin[];
  paymentHistory: FinanceInstallmentPaymentLine[];
};

export type FinancePreviousBillRow = {
  id: string;
  ay: string;
  titleEn: string;
  titleId: string;
  amount: number;
};

export type FinanceChildPayload = {
  billingMode: FinanceBillingMode;
  academicYearLabel: string | null;
  months: FinanceMonthSlot[];
  payableBills: FinancePayableBillSlot[];
  previous: FinancePreviousBillRow[];
  installments: FinanceInstallmentRow[];
  installmentGroups: FinanceInstallmentGroupRow[];
};

export const FINANCE_MONTH_GRID: { monthKey: string; monthLabelEn: string; monthLabelId: string }[] = [
  { monthKey: 'jul', monthLabelEn: 'Jul', monthLabelId: 'Jul' },
  { monthKey: 'aug', monthLabelEn: 'Aug', monthLabelId: 'Agu' },
  { monthKey: 'sep', monthLabelEn: 'Sep', monthLabelId: 'Sep' },
  { monthKey: 'oct', monthLabelEn: 'Oct', monthLabelId: 'Okt' },
  { monthKey: 'nov', monthLabelEn: 'Nov', monthLabelId: 'Nov' },
  { monthKey: 'dec', monthLabelEn: 'Dec', monthLabelId: 'Des' },
  { monthKey: 'jan', monthLabelEn: 'Jan', monthLabelId: 'Jan' },
  { monthKey: 'feb', monthLabelEn: 'Feb', monthLabelId: 'Feb' },
  { monthKey: 'mar', monthLabelEn: 'Mar', monthLabelId: 'Mar' },
  { monthKey: 'apr', monthLabelEn: 'Apr', monthLabelId: 'Apr' },
  { monthKey: 'may', monthLabelEn: 'May', monthLabelId: 'Mei' },
  { monthKey: 'jun', monthLabelEn: 'Jun', monthLabelId: 'Jun' },
];

const MONTH_KEY_TO_NUM: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

/** Tahun+bulan kalender saat ini di Asia/Jakarta (untuk outstanding SPP). */
export function jakartaCalendarYearMonth(nowMs: number = Date.now()): { year: number; month: number } {
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
  });
  const parts = dtf.formatToParts(new Date(nowMs));
  const year = Number(parts.find((p) => p.type === 'year')?.value ?? '0');
  const month = Number(parts.find((p) => p.type === 'month')?.value ?? '0');
  return { year, month };
}

/**
 * SPP monthly hanya dihitung outstanding jika bulan tagihan ≤ bulan berjalan (WIB).
 * Tagihan bulan depan yang sudah di-generate tidak masuk total tertunggak.
 */
export function isFinanceMonthDueOrPast(
  slot: Pick<FinanceMonthSlot, 'monthKey' | 'calendarYear'>,
  nowMs: number = Date.now(),
): boolean {
  if (slot.calendarYear == null) return false;
  const monthNum = MONTH_KEY_TO_NUM[slot.monthKey];
  if (!monthNum) return false;
  const { year, month } = jakartaCalendarYearMonth(nowMs);
  if (slot.calendarYear < year) return true;
  if (slot.calendarYear > year) return false;
  return monthNum <= month;
}

export function emptyFinanceChildPayload(): FinanceChildPayload {
  return {
    billingMode: 'talenta',
    academicYearLabel: null,
    months: FINANCE_MONTH_GRID.map((meta) => ({
      ...meta,
      calendarYear: null,
      amount: 0,
      status: 'unpaid' as const,
      billId: null,
    })),
    payableBills: [],
    previous: [],
    installments: [],
    installmentGroups: [],
  };
}
