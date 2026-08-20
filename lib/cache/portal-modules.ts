/** Shared key format with kreativa_erp — must stay identical. */
export const PORTAL_MODULES_TTL_SEC = 31536000; // 1 year — ERP invalidates on write

export function portalModulesSchoolKey(schoolId: number): string {
  return `portal:modules:v1:school:${schoolId}`;
}

export const PORTAL_MODULES_SCHOOL_PATTERN = 'portal:modules:v1:school:*';
