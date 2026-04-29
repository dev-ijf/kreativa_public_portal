/** Nilai kolom `tuition_payment_instructions.lang` (uppercase). */
export type PaymentInstructionDbLang = 'EN' | 'ID';

/**
 * `core_schools.theme_id === 1` → instruksi bahasa Inggris (EN).
 * Selain itu (mis. theme_id 2) → bahasa Indonesia (ID).
 */
export function paymentInstructionDbLangFromThemeId(themeId: number | null | undefined): PaymentInstructionDbLang {
  return themeId === 1 ? 'EN' : 'ID';
}
