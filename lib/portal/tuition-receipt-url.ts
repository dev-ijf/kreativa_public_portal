/** URL kuitansi PDF (stream inline, tab baru). */
export function buildTuitionReceiptPdfUrl(transactionId: string, transactionCreatedAt: string): string {
  return `/api/portal/finance/receipt?transactionId=${encodeURIComponent(transactionId)}&createdAt=${encodeURIComponent(transactionCreatedAt)}`;
}

export function openTuitionReceiptPdf(transactionId: string, transactionCreatedAt: string): void {
  if (typeof window === 'undefined') return;
  window.open(buildTuitionReceiptPdfUrl(transactionId, transactionCreatedAt), '_blank', 'noopener,noreferrer');
}
