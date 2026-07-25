import { isKgLevelName } from '@/lib/report-card/grading';

export type KindergartenCheckInput = {
  levelGradeName?: string | null;
  levelOrder?: number | null;
};

export type DailyReportLevelCheckInput = KindergartenCheckInput;

function isTkLevelName(name: string | null | undefined): boolean {
  if (!name) return false;
  const n = String(name).trim();
  return /^tk\b/i.test(n) || /^ey\d/i.test(n) || /^nursery/i.test(n) || /\bkg\b/i.test(n);
}

function isPrimaryLevelName(name: string | null | undefined): boolean {
  if (!name) return false;
  const n = String(name).trim();
  if (/^p[1-6]$/i.test(n)) return true;
  if (/^primary\b/i.test(n)) return true;
  if (/^sd\b/i.test(n)) return true;
  if (/^grade\s*[1-6]\b/i.test(n)) return true;
  return false;
}

/** True when the student is in kindergarten (TK / EY / K1–K2 / level_order ≤ 0). */
export function isKindergartenStudent(child: KindergartenCheckInput): boolean {
  if (child.levelOrder != null && child.levelOrder <= 0) return true;
  return isKgLevelName(child.levelGradeName) || isTkLevelName(child.levelGradeName);
}

/**
 * True when the student is in primary (P1–P6 / level_order 1–6).
 * Secondary/high school (level_order ≥ 7) is excluded.
 */
export function isPrimaryStudent(child: DailyReportLevelCheckInput): boolean {
  if (isKindergartenStudent(child)) return false;
  if (child.levelOrder != null) {
    return child.levelOrder >= 1 && child.levelOrder <= 6;
  }
  return isPrimaryLevelName(child.levelGradeName);
}

/** KG + Primary students may use parent Daily Reports. */
export function isDailyReportStudent(child: DailyReportLevelCheckInput): boolean {
  return isKindergartenStudent(child) || isPrimaryStudent(child);
}
