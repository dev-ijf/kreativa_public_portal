import { isKgLevelName } from '@/lib/report-card/grading';

export type KindergartenCheckInput = {
  levelGradeName?: string | null;
  levelOrder?: number | null;
  /** Campus name, e.g. "Kreativa Global High School". */
  schoolName?: string | null;
  /** Class name, e.g. "S4 B" / "1A". */
  className?: string | null;
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

function isPrimarySchoolName(name: string | null | undefined): boolean {
  if (!name) return false;
  if (isSecondaryOrHsSchoolName(name)) return false;
  const n = String(name).trim();
  return /\bprimary\b/i.test(n) || /\bsd\b/i.test(n) || /\belementary\b/i.test(n);
}

function isSecondaryOrHsLevelName(name: string | null | undefined): boolean {
  if (!name) return false;
  const n = String(name).trim();
  if (/^secondary\b/i.test(n)) return true;
  if (/^junior\b/i.test(n)) return true;
  if (/high\s*school/i.test(n) || /highschool/i.test(n)) return true;
  if (/igcse/i.test(n)) return true;
  if (/a[\s-]?level/i.test(n)) return true;
  if (/^grade\s*(7|8|9|10|11|12)\b/i.test(n)) return true;
  if (/^g(7|8|9|10|11|12)\b/i.test(n)) return true;
  if (/^year\s*[1-5]\b/i.test(n)) return true;
  if (/^smp\b/i.test(n) || /^sma\b/i.test(n)) return true;
  if (/lower\s*secondary/i.test(n)) return true;
  // High-school style level codes: S1–S6, HS1–HS4
  if (/^s[1-6]\b/i.test(n)) return true;
  if (/^hs[1-4]\b/i.test(n)) return true;
  return false;
}

/** School campus name indicates Secondary / High School. */
function isSecondaryOrHsSchoolName(name: string | null | undefined): boolean {
  if (!name) return false;
  const n = String(name).trim();
  if (/secondary/i.test(n)) return true;
  if (/high\s*school/i.test(n)) return true;
  if (/highschool/i.test(n)) return true;
  if (/\bhigh\b/i.test(n) && !/\bprimary\b/i.test(n) && !/\bkindergarten\b/i.test(n)) {
    // e.g. "KGS High", "Kreativa High" (not "Highlight Primary")
    return true;
  }
  if (/\bigcse\b/i.test(n)) return true;
  if (/\ba[\s-]?level\b/i.test(n)) return true;
  if (/\bsmp\b/i.test(n) || /\bsma\b/i.test(n)) return true;
  return false;
}

/** Class codes used at Secondary/HS (e.g. "S4 B", "S1A", "HS2"). */
function isSecondaryOrHsClassName(name: string | null | undefined): boolean {
  if (!name) return false;
  const n = String(name).trim();
  if (/^s[1-6](\s|[A-Za-z]|$)/i.test(n)) return true;
  if (/^hs[1-4]\b/i.test(n)) return true;
  if (/^y(?:ear)?\s*(7|8|9|10|11|12|13)\b/i.test(n)) return true;
  return false;
}

/** True when campus, grade, or class clearly marks Secondary / High School. */
function isSecondaryCampusOrLevel(child: DailyReportLevelCheckInput): boolean {
  return (
    isSecondaryOrHsSchoolName(child.schoolName) ||
    isSecondaryOrHsLevelName(child.levelGradeName) ||
    isSecondaryOrHsClassName(child.className)
  );
}

/** Campus name indicates Kindergarten / Early Years. */
function isKindergartenSchoolName(name: string | null | undefined): boolean {
  if (!name) return false;
  const n = String(name).trim();
  if (isSecondaryOrHsSchoolName(n)) return false;
  return (
    /\bkindergarten\b/i.test(n) ||
    /\bearly\s*years?\b/i.test(n) ||
    /\btk\b/i.test(n) ||
    /\bnursery\b/i.test(n)
  );
}

/** True when the student is in kindergarten (TK / EY / K1–K2 / level_order ≤ 0). */
export function isKindergartenStudent(child: KindergartenCheckInput): boolean {
  if (isSecondaryCampusOrLevel(child)) return false;
  if (isKindergartenSchoolName(child.schoolName)) return true;
  if (child.levelOrder != null && child.levelOrder <= 0) return true;
  return isKgLevelName(child.levelGradeName) || isTkLevelName(child.levelGradeName);
}

/**
 * True when the student is Primary.
 * Secondary/HS campus, level, or class (e.g. "S4 B") is excluded first so
 * High School S4 with level_order 4 is never treated as Primary Grade 4.
 */
export function isPrimaryStudent(child: DailyReportLevelCheckInput): boolean {
  if (isKindergartenStudent(child)) return false;
  if (isSecondaryCampusOrLevel(child)) return false;
  if (isPrimaryLevelName(child.levelGradeName)) return true;
  if (isPrimarySchoolName(child.schoolName)) return true;
  // Only after Secondary/HS signals are ruled out
  if (child.levelOrder != null) {
    return child.levelOrder >= 1 && child.levelOrder <= 6;
  }
  return false;
}

/** KG + Primary students may use parent Daily Reports (teacher-filled, read-only). */
export function isDailyReportStudent(child: DailyReportLevelCheckInput): boolean {
  return isKindergartenStudent(child) || isPrimaryStudent(child);
}

/**
 * True when the student is Lower Secondary or High School.
 * Prefers school / class / level name so Year 1 Secondary & HS S4 are not treated as Primary.
 */
export function isSecondaryOrHighSchoolStudent(child: DailyReportLevelCheckInput): boolean {
  if (isKindergartenStudent(child)) return false;
  if (isSecondaryCampusOrLevel(child)) return true;
  if (isPrimaryStudent(child)) return false;
  if (child.levelOrder != null && child.levelOrder >= 7) return true;
  return false;
}

/**
 * Map student level to `dr_daily_reports.school_level` for Secondary/HS writes.
 */
export function resolveDrSchoolLevel(child: DailyReportLevelCheckInput): DrSchoolLevel {
  if (isKindergartenStudent(child)) return 'kindergarten';
  if (isPrimaryStudent(child)) return 'primary';

  const name = (child.levelGradeName ?? '').trim();
  const school = (child.schoolName ?? '').trim();
  const className = (child.className ?? '').trim();

  if (/a[\s-]?level/i.test(name) || /a[\s-]?level/i.test(school)) {
    return 'high_school_alevel';
  }
  if (
    /igcse/i.test(name) ||
    /igcse/i.test(school) ||
    /high\s*school/i.test(school) ||
    /highschool/i.test(school) ||
    /^s[1-6]\b/i.test(className) ||
    /^s[1-6]\b/i.test(name)
  ) {
    return 'high_school_igcse';
  }

  const order = child.levelOrder;
  if (order != null && order >= 7) {
    if (order >= 11) return 'high_school_alevel';
    if (order >= 9) return 'high_school_igcse';
    return 'lower_secondary';
  }

  if (/^grade\s*(11|12)\b/i.test(name) || /^g(11|12)\b/i.test(name)) {
    return 'high_school_alevel';
  }
  if (/^grade\s*(9|10)\b/i.test(name) || /^g(9|10)\b/i.test(name)) {
    return 'high_school_igcse';
  }

  return 'lower_secondary';
}
