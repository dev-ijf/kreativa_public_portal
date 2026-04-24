import { getServerSession } from 'next-auth';
import { SchedulesPageClient } from '@/components/portal/pages/SchedulesPageClient';
import { authOptions } from '@/lib/auth';
import { getSchedulesForPortal } from '@/lib/data/server/schedules';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.userId;
  const role = session?.user?.role ?? '';

  const initialSchedules =
    userId != null ? await getSchedulesForPortal(userId, role) : [];

  return <SchedulesPageClient initialSchedules={initialSchedules} />;
}
