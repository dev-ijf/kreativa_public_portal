'use client';

import { useActiveChild } from '@/components/portal/state/PortalProvider';
import {
  isDailyReportStudent,
  isSecondaryOrHighSchoolStudent,
} from '@/lib/portal/is-kindergarten';
import {
  isTalentaSchool,
  resolvePortalTenantFromHost,
} from '@/lib/portal/tenant';
import { DailyReportsPageClient } from '@/components/portal/pages/DailyReportsPageClient';
import { HabitsPageClient } from '@/components/portal/pages/HabitsPageClient';
import { SecondaryDailyPageClient } from '@/components/portal/pages/SecondaryDailyPageClient';

type Props = {
  tenant?: 'kreativa' | 'talenta';
};

/**
 * `/habits` entry:
 * - Talenta schools → academic_habits (HabitsPageClient) — 2 tabs only
 * - Kreativa Secondary / HS → dr_daily_reports (SecondaryDailyPageClient)
 * - Kreativa KG / Primary → teacher Daily Reports (parent read-view)
 */
export function HabitsEntryClient({ tenant: tenantProp }: Props) {
  const activeChild = useActiveChild();

  const hostTenant =
    tenantProp ??
    (typeof window !== 'undefined'
      ? resolvePortalTenantFromHost(window.location.hostname)
      : 'kreativa');

  // Prefer school name so Talenta students never get Kreativa Secondary UI
  // even when browsing on the kreativaglobal host.
  const useTalentaHabits =
    hostTenant === 'talenta' || isTalentaSchool(activeChild?.schoolName);

  if (useTalentaHabits) {
    return <HabitsPageClient />;
  }

  const child = activeChild ?? {};

  if (isSecondaryOrHighSchoolStudent(child)) {
    return <SecondaryDailyPageClient />;
  }

  if (isDailyReportStudent(child)) {
    return <DailyReportsPageClient />;
  }

  return <SecondaryDailyPageClient />;
}
