import { SchedulesPageClient } from '@/components/portal/pages/SchedulesPageClient';
import { getCachedServerSession } from '@/lib/auth-cached';
import { getLmsWeeklyPlansForPortal } from '@/lib/data/server/lms-weekly-plans';
import { getWeeklyPlansForPortal } from '@/lib/data/server/weekly-plans';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const session = await getCachedServerSession();
  const userId = session?.user?.userId;
  const role = session?.user?.role ?? '';

  const [initialPlans, initialLmsPlans] =
    userId != null
      ? await Promise.all([
          getWeeklyPlansForPortal(userId, role),
          getLmsWeeklyPlansForPortal(userId, role),
        ])
      : [[], []];

  return (
    <SchedulesPageClient
      initialPlans={initialPlans}
      initialLmsPlans={initialLmsPlans}
    />
  );
}
