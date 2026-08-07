export type PortalTenantId = 'kreativa' | 'talenta';

const GA_MEASUREMENT_IDS: Record<PortalTenantId, string> = {
  kreativa: 'G-8LG66QLGLE',
  talenta: 'G-432WYS41W1',
};

const PWA_APP_NAMES: Record<PortalTenantId, { name: string; shortName: string }> = {
  kreativa: { name: 'Kreativa Parents', shortName: 'Kreativa Parents' },
  talenta: { name: 'Talenta Juara Parents', shortName: 'Talenta Parents' },
};

/** Client-side tenant from hostname (middleware sets x-tenant-id the same way). */
export function resolvePortalTenantFromHost(hostname: string): PortalTenantId {
  return hostname.includes('talentajuara') ? 'talenta' : 'kreativa';
}

export function getGaMeasurementId(tenant: PortalTenantId): string {
  return GA_MEASUREMENT_IDS[tenant];
}

/** Home-screen / install dialog labels per tenant. */
export function getPwaAppNames(tenant: PortalTenantId): { name: string; shortName: string } {
  return PWA_APP_NAMES[tenant];
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
