"use client";

import { useActiveChild } from "@/components/portal/state/PortalProvider";
import { isKindergartenStudent } from "@/lib/portal/is-kindergarten";
import { HabitsPageClient } from "@/components/portal/pages/HabitsPageClient";
import { DailyReportsPageClient } from "@/components/portal/pages/DailyReportsPageClient";

export function HabitsEntryClient() {
  const activeChild = useActiveChild();
  const isKg = isKindergartenStudent(activeChild ?? {});

  if (isKg) {
    return <DailyReportsPageClient />;
  }

  return <HabitsPageClient />;
}
