export function isBmiPaymentMethod(vendor: string | null | undefined, code: string | null | undefined): boolean {
  const v = (vendor ?? '').trim().toUpperCase();
  const c = (code ?? '').trim().toUpperCase();
  return v === 'BMI' || c === 'BMI';
}
