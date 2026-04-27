/**
 * Tipe + helper UI finance portal — aman untuk `"use client"` (tanpa import DB).
 */

export type FinanceMonthSlot = {
  monthKey: string;
  monthLabelEn: string;
  monthLabelId: string;
  amount: number;
  status: 'paid' | 'unpaid';
  billId: string | null;
};

export type FinanceInstallmentRow = {
  id: string;
  nameEn: string;
  nameId: string;
  total: number;
  paid: number;
  minPayment: number;
  paymentHistory: { date: string; amount: number }[];
};

export type FinancePreviousBillRow = {
  id: string;
  ay: string;
  titleEn: string;
  titleId: string;
  amount: number;
};

export type FinanceChildPayload = {
  academicYearLabel: string | null;
  months: FinanceMonthSlot[];
  previous: FinancePreviousBillRow[];
  installments: FinanceInstallmentRow[];
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

export function emptyFinanceChildPayload(): FinanceChildPayload {
  return {
    academicYearLabel: null,
    months: FINANCE_MONTH_GRID.map((meta) => ({
      ...meta,
      amount: 0,
      status: 'unpaid' as const,
      billId: null,
    })),
    previous: [],
    installments: [],
  };
}
