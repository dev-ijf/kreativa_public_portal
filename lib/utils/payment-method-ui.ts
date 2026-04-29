import type { PortalPaymentMethodOption, PortalSelectedPaymentState } from '@/lib/data/portal-payment';

export function categoryToPaymentUiType(category: string, code: string): PortalSelectedPaymentState['type'] {
  const c = category.trim().toLowerCase();
  const cod = code.trim().toUpperCase();
  if (c === 'qris' || cod === 'QRIS') return 'qris';
  if (c === 'ewallet') return 'ewallet';
  if (c === 'cash' || c === 'manual' || cod === 'KAS') return 'manual';
  return 'va';
}

export function portalOptionToPaymentMethod(row: PortalPaymentMethodOption): PortalSelectedPaymentState {
  return {
    id: `db-${row.dbMethodId}`,
    dbMethodId: row.dbMethodId,
    label: row.name,
    type: categoryToPaymentUiType(row.category, row.code),
    code: row.code,
    category: row.category,
    vendor: row.vendor,
    logoUrl: row.logoUrl ?? null,
  };
}
