"use client";

import { useActiveChild } from "@/components/portal/state/PortalProvider";
import {
  isDailyReportStudent,
  isSecondaryOrHighSchoolStudent,
} from "@/lib/portal/is-kindergarten";
import { DailyReportsPageClient } from "@/components/portal/pages/DailyReportsPageClient";
import { SecondaryDailyPageClient } from "@/components/portal/pages/SecondaryDailyPageClient";

/**
 * `/habits` entry:
 * - KG / Primary → teacher Daily Reports (parent read-view)
 * - Secondary / HS → student self-report CRUD (Habits-like)
 */
export function HabitsEntryClient() {
  const activeChild = useActiveChild();
  const child = activeChild ?? {};

  if (isDailyReportStudent(child)) {
    return <DailyReportsPageClient />;
  }

  if (isSecondaryOrHighSchoolStudent(child)) {
    return <SecondaryDailyPageClient />;
  }

  // Fallback: treat unknown levels as Secondary self-report if not KG/Primary
  return <SecondaryDailyPageClient />;
}
