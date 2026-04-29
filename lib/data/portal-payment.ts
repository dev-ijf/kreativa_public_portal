/** Tipe serialisasi portal (RSC / API / client), tanpa import DB. */

/** State metode terpilih (localStorage + context). */
export type PortalSelectedPaymentState = {
  id: string;
  dbMethodId: number;
  label: string;
  sublabel?: string;
  type: 'va' | 'qris' | 'ewallet' | 'manual';
  code?: string;
  category?: string;
  vendor?: string | null;
};

export type PortalPaymentMethodOption = {
  dbMethodId: number;
  name: string;
  code: string;
  category: string;
  vendor: string | null;
  sortOrder: number | null;
};

export type PortalPaymentInstructionRow = {
  id: number;
  title: string;
  description: string;
  stepOrder: number | null;
};
