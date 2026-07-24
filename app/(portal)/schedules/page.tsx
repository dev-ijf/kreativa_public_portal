import { SchedulesPageClient } from '@/components/portal/pages/SchedulesPageClient';
import { getCachedServerSession } from '@/lib/auth-cached';
import { getWeeklyPlansForPortal } from '@/lib/data/server/weekly-plans';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const session = await getCachedServerSession();
  const userId = session?.user?.userId;
  const role = session?.user?.role ?? '';

  const initialPlans =
    userId != null ? await getWeeklyPlansForPortal(userId, role) : [];

  return <SchedulesPageClient initialPlans={initialPlans} />;
}
