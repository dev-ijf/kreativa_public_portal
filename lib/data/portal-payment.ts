/** Tipe serialisasi portal (RSC / API / client), tanpa import DB. */

/** State metode terpilih (localStorage + context). */
export type PortalSelectedPaymentState = {
  id: string;
  dbMethodId: number;
  label: string;
  /** @deprecated Tidak dipakai di UI; logo dari `logoUrl`. */
  sublabel?: string;
  type: 'va' | 'qris' | 'ewallet' | 'manual';
  code?: string;
  category?: string;
  vendor?: string | null;
  logoUrl?: string | null;
};

export type PortalPaymentMethodOption = {
  dbMethodId: number;
  name: string;
  code: string;
  category: string;
  vendor: string | null;
  logoUrl?: string | null;
  sortOrder: number | null;
};

export type PortalPaymentInstructionRow = {
  id: number;
  title: string;
  description: string;
  stepOrder: number | null;
};

/** Item keranjang untuk body POST `/api/portal/checkout` (mirror `CartItem` di PortalProvider). */
export type PortalCheckoutCartItem = {
  id: string;
  childId: number;
  childName: string;
  type: 'tuition' | 'installment' | 'previous';
  title: string;
  amount: number;
};

export const PORTAL_CHECKOUT_SESSION_KEY = 'portal.checkout';

/** Snapshot ringan setelah POST checkout (sessionStorage). */
export type PortalCheckoutSessionPayload = {
  referenceNo: string;
  /** Diisi setelah checkout API; diperlukan untuk unduh PDF instruksi. */
  transactionId?: string;
  transactionCreatedAt?: string;
  /** Total transaksi (agar UI instruksi tetap benar setelah cart dikosongkan). */
  totalAmount?: number;
  vaNo: string | null;
  vaDisplay: string | null;
  expiryAt: string;
  isBmi: boolean;
  /** Instruksi dari response checkout — menghindari round-trip GET ke API. */
  instructionRows?: PortalPaymentInstructionRow[];
  /** Metode pembayaran saat snapshot checkout (untuk cocokkan dengan `selectedPayment`). */
  checkoutMethodId?: number;
  /** Siswa checkout (filter instruksi `lang` per theme sekolah). */
  studentId?: number;
};
