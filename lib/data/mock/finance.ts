export type TuitionMonth = {
  monthKey: string;
  monthLabelEn: string;
  monthLabelId: string;
  amount: number;
  status: 'paid' | 'unpaid';
};

export type Installment = {
  id: string;
  nameEn: string;
  nameId: string;
  total: number;
  paid: number;
  minPayment: number;
  paymentHistory: { date: string; amount: number }[];
};

export type PreviousBill = {
  id: string;
  ay: string;
  titleEn: string;
  titleId: string;
  amount: number;
};

export const TUITION_MONTHS: TuitionMonth[] = [
  { monthKey: 'jul', monthLabelEn: 'Jul', monthLabelId: 'Jul', amount: 850000, status: 'paid' },
  { monthKey: 'aug', monthLabelEn: 'Aug', monthLabelId: 'Agu', amount: 850000, status: 'paid' },
  { monthKey: 'sep', monthLabelEn: 'Sep', monthLabelId: 'Sep', amount: 850000, status: 'unpaid' },
  { monthKey: 'oct', monthLabelEn: 'Oct', monthLabelId: 'Okt', amount: 850000, status: 'unpaid' },
  { monthKey: 'nov', monthLabelEn: 'Nov', monthLabelId: 'Nov', amount: 850000, status: 'unpaid' },
  { monthKey: 'dec', monthLabelEn: 'Dec', monthLabelId: 'Des', amount: 850000, status: 'unpaid' },
  { monthKey: 'jan', monthLabelEn: 'Jan', monthLabelId: 'Jan', amount: 850000, status: 'unpaid' },
  { monthKey: 'feb', monthLabelEn: 'Feb', monthLabelId: 'Feb', amount: 850000, status: 'unpaid' },
  { monthKey: 'mar', monthLabelEn: 'Mar', monthLabelId: 'Mar', amount: 850000, status: 'unpaid' },
  { monthKey: 'apr', monthLabelEn: 'Apr', monthLabelId: 'Apr', amount: 850000, status: 'unpaid' },
  { monthKey: 'may', monthLabelEn: 'May', monthLabelId: 'Mei', amount: 850000, status: 'unpaid' },
  { monthKey: 'jun', monthLabelEn: 'Jun', monthLabelId: 'Jun', amount: 850000, status: 'unpaid' },
];

export const INSTALLMENTS_BY_CHILD: Record<number, Installment[]> = {
  1: [
    {
      id: 'inst-1',
      nameEn: 'Building Fund',
      nameId: 'Uang Pangkal',
      total: 6000000,
      paid: 3000000,
      minPayment: 250000,
      paymentHistory: [
        { date: '2026-01-10', amount: 1500000 },
        { date: '2026-03-10', amount: 1500000 },
      ],
    },
  ],
  2: [
    {
      id: 'inst-2',
      nameEn: 'Activities Fee',
      nameId: 'Kegiatan',
      total: 2400000,
      paid: 600000,
      minPayment: 200000,
      paymentHistory: [{ date: '2026-02-01', amount: 600000 }],
    },
  ],
};

export const PREVIOUS_BILLS_BY_CHILD: Record<number, PreviousBill[]> = {
  1: [
    {
      id: 'prev-1',
      ay: '2022/2023',
      titleEn: 'Outstanding Tuition (May)',
      titleId: 'Tunggakan SPP (Mei)',
      amount: 850000,
    },
  ],
};

