/** Shared key format with kreativa_erp — must stay identical. */
export const PORTAL_KG_HABITS_TTL_SEC = 31536000; // 1 year

export function portalKgHabitDefinitionsKey(): string {
  return 'portal:kg-habits:v1:definitions';
}
