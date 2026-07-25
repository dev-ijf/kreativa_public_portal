import { isKgLevelName } from '@/lib/report-card/grading';

export type KindergartenCheckInput = {
  levelGradeName?: string | null;
  levelOrder?: number | null;
};

export type DailyReportLevelCheckInput = KindergartenCheckInput;

export type DrSchoolLevel =
  | 'kindergarten'
  | 'primary'
  | 'lower_secondary'
  | 'high_school_igcse'
  | 'high_school_alevel';

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

function isSecondaryOrHsLevelName(name: string | null | undefined): boolean {
  if (!name) return false;
  const n = String(name).trim();
  if (/^secondary\b/i.test(n)) return true;
  if (/^junior\b/i.test(n)) return true;
  if (/high\s*school/i.test(n)) return true;
  if (/igcse/i.test(n)) return true;
  if (/a[\s-]?level/i.test(n)) return true;
  if (/^grade\s*(7|8|9|10|11|12)\b/i.test(n)) return true;
  if (/^g(7|8|9|10|11|12)\b/i.test(n)) return true;
  if (/^smp\b/i.test(n) || /^sma\b/i.test(n)) return true;
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

/** KG + Primary students may use parent Daily Reports (teacher-filled, read-only). */
export function isDailyReportStudent(child: DailyReportLevelCheckInput): boolean {
  return isKindergartenStudent(child) || isPrimaryStudent(child);
}

/**
 * True when the student is Lower Secondary or High School
 * (level_order ≥ 7, or secondary/HS name patterns).
 */
export function isSecondaryOrHighSchoolStudent(child: DailyReportLevelCheckInput): boolean {
  if (isKindergartenStudent(child) || isPrimaryStudent(child)) return false;
  if (child.levelOrder != null) return child.levelOrder >= 7;
  return isSecondaryOrHsLevelName(child.levelGradeName);
}

/**
 * Map student level to `dr_daily_reports.school_level` for Secondary/HS writes.
 * Defaults: 7–8 → lower_secondary, 9–10 → high_school_igcse, 11+ → high_school_alevel.
 */
export function resolveDrSchoolLevel(child: DailyReportLevelCheckInput): DrSchoolLevel {
  if (isKindergartenStudent(child)) return 'kindergarten';
  if (isPrimaryStudent(child)) return 'primary';

  const name = (child.levelGradeName ?? '').trim();
  if (/a[\s-]?level/i.test(name)) return 'high_school_alevel';
  if (/igcse/i.test(name)) return 'high_school_igcse';

  const order = child.levelOrder;
  if (order != null) {
    if (order >= 11) return 'high_school_alevel';
    if (order >= 9) return 'high_school_igcse';
    if (order >= 7) return 'lower_secondary';
  }

  if (/^grade\s*(11|12)\b/i.test(name) || /^g(11|12)\b/i.test(name)) {
    return 'high_school_alevel';
  }
  if (/^grade\s*(9|10)\b/i.test(name) || /^g(9|10)\b/i.test(name) || /high\s*school/i.test(name)) {
    return 'high_school_igcse';
  }
  return 'lower_secondary';
}
