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
 * - Secondary / HS → student self-report CRUD (Habits-like) — checked first
 *   so Year 1 Secondary (level_order 1, class "1A") is not treated as Primary
 * - KG / Primary → teacher Daily Reports (parent read-view)
 */
export function HabitsEntryClient() {
  const activeChild = useActiveChild();
  const child = activeChild ?? {};

  // Secondary first: school name "… Secondary" beats level_order 1–6 Primary heuristic
  if (isSecondaryOrHighSchoolStudent(child)) {
    return <SecondaryDailyPageClient />;
  }

  if (isDailyReportStudent(child)) {
    return <DailyReportsPageClient />;
  }

  return <SecondaryDailyPageClient />;
}
