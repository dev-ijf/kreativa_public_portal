/** Batas bayar portal / VA countdown: **1 jam** sejak `created_at` checkout. */
const ONE_H_MS = 60 * 60 * 1000;

export function computePortalPaymentExpiryMs(createdAtMs: number): number {
  if (!Number.isFinite(createdAtMs)) {
    return Date.now() + ONE_H_MS;
  }
  return createdAtMs + ONE_H_MS;
}

export function computePortalPaymentExpiryIso(createdAtMs: number): string {
  return new Date(computePortalPaymentExpiryMs(createdAtMs)).toISOString();
}
