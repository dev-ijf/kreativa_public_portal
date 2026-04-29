import { UpdatesPageClient } from '@/components/portal/pages/UpdatesPageClient';
import { getCachedServerSession } from '@/lib/auth-cached';
import { getAnnouncementsPage } from '@/lib/data/server/announcements';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const session = await getCachedServerSession();
  const userId = session?.user?.userId;
  const role = session?.user?.role ?? '';

  const { rows, nextCursor } =
    userId != null
      ? await getAnnouncementsPage(userId, role, { limit: 10, cursor: null })
      : { rows: [], nextCursor: null };

  return <UpdatesPageClient initialRows={rows} initialNextCursor={nextCursor} />;
}
