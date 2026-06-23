import { isKgLevelName } from '@/lib/report-card/grading';

export type KindergartenCheckInput = {
  levelGradeName?: string | null;
  levelOrder?: number | null;
};

function isTkLevelName(name: string | null | undefined): boolean {
  if (!name) return false;
  const n = String(name).trim();
  return /^tk\b/i.test(n) || /^ey\d/i.test(n) || /^nursery/i.test(n) || /\bkg\b/i.test(n);
}

/** True when the student is in kindergarten (TK / EY / K1–K2 / level_order ≤ 0). */
export function isKindergartenStudent(child: KindergartenCheckInput): boolean {
  if (child.levelOrder != null && child.levelOrder <= 0) return true;
  return isKgLevelName(child.levelGradeName) || isTkLevelName(child.levelGradeName);
}
