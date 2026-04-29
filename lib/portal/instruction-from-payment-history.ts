import type { PortalCheckoutSessionPayload, PortalSelectedPaymentState } from '@/lib/data/portal-payment';
import { PORTAL_CHECKOUT_SESSION_KEY } from '@/lib/data/portal-payment';
import type { PortalTuitionTransaction } from '@/lib/data/server/finance-transactions';
import { categoryToPaymentUiType } from '@/lib/utils/payment-method-ui';

export function paymentMethodFromPendingTransaction(tx: PortalTuitionTransaction): PortalSelectedPaymentState | null {
  const id = tx.paymentMethodId;
  if (id == null || !Number.isFinite(id) || id <= 0) return null;
  const code = tx.paymentMethodCode ?? '';
  const cat = tx.paymentMethodCategory ?? '';
  return {
    id: `db-${id}`,
    dbMethodId: id,
    label: tx.paymentMethodName ?? '—',
    type: categoryToPaymentUiType(cat, code),
    code: code || undefined,
    category: cat || undefined,
    vendor: tx.paymentMethodVendor ?? null,
    logoUrl: tx.paymentMethodLogoUrl ?? null,
  };
}

/** Siapkan sessionStorage + localStorage agar `/instruction` sama seperti setelah checkout. */
export function persistPortalSessionForPendingInstruction(tx: PortalTuitionTransaction): PortalSelectedPaymentState | null {
  if (typeof window === 'undefined') return paymentMethodFromPendingTransaction(tx);

  const vaRaw = tx.vaNo != null ? String(tx.vaNo) : '';
  const vaDisplay = vaRaw ? vaRaw.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ').trim() : null;

  const snap: PortalCheckoutSessionPayload = {
    referenceNo: tx.referenceNo,
    transactionId: tx.transactionId,
    transactionCreatedAt: tx.transactionCreatedAt,
    totalAmount: tx.totalAmount,
    vaNo: tx.vaNo,
    vaDisplay,
    expiryAt: tx.checkoutExpiryIso ?? new Date().toISOString(),
    isBmi: Boolean(tx.isBmi),
  };
  try {
    sessionStorage.setItem(PORTAL_CHECKOUT_SESSION_KEY, JSON.stringify(snap));
  } catch {
    /* ignore */
  }

  const pm = paymentMethodFromPendingTransaction(tx);
  try {
    if (pm) localStorage.setItem('portal.selectedPayment', JSON.stringify(pm));
    else localStorage.removeItem('portal.selectedPayment');
  } catch {
    /* ignore */
  }
  return pm;
}
