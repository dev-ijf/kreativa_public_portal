export type PortalTenantId = 'kreativa' | 'talenta';

/** Client-side tenant from hostname (middleware sets x-tenant-id the same way). */
export function resolvePortalTenantFromHost(hostname: string): PortalTenantId {
  return hostname.includes('talentajuara') ? 'talenta' : 'kreativa';
}

/**
 * True when the student's school is Talenta Juara (works even if the parent
 * portal host is kreativa during shared/local testing).
 */
export function isTalentaSchool(schoolName: string | null | undefined): boolean {
  if (!schoolName) return false;
  const n = schoolName.trim().toLowerCase();
  return n.includes('talenta') || n.includes('talentajuara');
}
