export const GRADE_BANDS = [
  { value: 'TK', labelEn: 'TK (Kindergarten)', labelId: 'TK' },
  { value: 'g1-3', labelEn: 'Grade 1-3', labelId: 'Kelas 1-3' },
  { value: 'g4-6', labelEn: 'Grade 4-6', labelId: 'Kelas 4-6' },
  { value: 'g7-9', labelEn: 'Grade 7-9', labelId: 'Kelas 7-9' },
  { value: 'g10-12', labelEn: 'Grade 10-12', labelId: 'Kelas 10-12' },
] as const;

export type GradeBandValue = (typeof GRADE_BANDS)[number]['value'];

const VALID_VALUES = new Set<string>(GRADE_BANDS.map((b) => b.value));

export function isValidGradeBand(v: unknown): v is GradeBandValue {
  return typeof v === 'string' && VALID_VALUES.has(v);
}
