export type GradingMethod = 'average' | 'top_n';
export type GradeOutput = 'letter' | 'number';

export function computeAverage(
  scores: Array<number | null | undefined>,
  method: GradingMethod = 'average',
  topN: number | null | undefined = null
): number | null {
  const filled = scores.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  if (filled.length === 0) return null;

  if (method === 'top_n' && topN && topN > 0 && filled.length >= topN) {
    const sorted = [...filled].sort((a, b) => b - a);
    const sum = sorted.slice(0, topN).reduce((a, b) => a + b, 0);
    return roundTo2(sum / topN);
  }

  const sum = filled.reduce((a, b) => a + b, 0);
  return roundTo2(sum / filled.length);
}

export function computeFinalGrade(
  averageTest: number | null | undefined,
  semesterAssessment: number | null | undefined,
  faWeight: number = 0.4,
  saWeight: number = 0.6
): number | null {
  const a = typeof averageTest === 'number' && Number.isFinite(averageTest) ? averageTest : null;
  const s =
    typeof semesterAssessment === 'number' && Number.isFinite(semesterAssessment)
      ? semesterAssessment
      : null;
  if (a == null && s == null) return null;
  if (a == null) return roundTo2((s ?? 0) * (faWeight + saWeight));
  if (s == null) return roundTo2(a * (faWeight + saWeight));
  return roundTo2(faWeight * a + saWeight * s);
}

export function numericToLetter(n: number | null | undefined): string | null {
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  if (n >= 95) return 'A+';
  if (n >= 85) return 'A';
  if (n >= 75) return 'B+';
  if (n >= 65) return 'B';
  return 'C';
}

export function roundTo2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function computeYearOverall(
  semester1Final: number | null | undefined,
  semester2Final: number | null | undefined
): number | null {
  const a =
    typeof semester1Final === 'number' && Number.isFinite(semester1Final) ? semester1Final : null;
  const b =
    typeof semester2Final === 'number' && Number.isFinite(semester2Final) ? semester2Final : null;
  if (a == null && b == null) return null;
  if (a == null) return roundTo2(b ?? 0);
  if (b == null) return roundTo2(a);
  return roundTo2((a + b) / 2);
}

export function isKgLevelName(name: string | null | undefined): boolean {
  if (!name) return false;
  const n = String(name).trim();
  return /^k\d/i.test(n) || /^kindergarten/i.test(n);
}

export function isLetterOutputLevel(name: string | null | undefined): boolean {
  if (!name) return false;
  const n = String(name).trim();
  if (/^p[1-3]$/i.test(n)) return true;
  const m = /^primary\s+(\d+)/i.exec(n);
  if (m) return Number(m[1]) >= 1 && Number(m[1]) <= 3;
  return false;
}

export const KG_SCALE = ['Emerging', 'Developing', 'Secure', 'Exceeding'] as const;
export const PRIMARY_SCALE = ['Improving', 'Good', 'Very Good', 'Excellent'] as const;

export function isValidIndicatorScore(score: string, isKg: boolean): boolean {
  const allowed = isKg ? KG_SCALE : PRIMARY_SCALE;
  return (allowed as readonly string[]).includes(score);
}
