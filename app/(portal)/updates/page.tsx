import { AgendaUpdatesPageClient } from '@/components/portal/pages/AgendaUpdatesPageClient';
import { getCachedServerSession } from '@/lib/auth-cached';
import { getAgendasForPortal } from '@/lib/data/server/agendas';
import { getAnnouncementsPage } from '@/lib/data/server/announcements';

export const dynamic = 'force-dynamic';

type Props = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function Page({ searchParams }: Props) {
  const session = await getCachedServerSession();
  const userId = session?.user?.userId;
  const role = session?.user?.role ?? '';
  const sp = await searchParams;
  const initialTab = sp.tab === 'agenda' ? 'agenda' : 'updates';

  const [initialAgendas, announcements] = await Promise.all([
    userId != null ? getAgendasForPortal(userId, role) : Promise.resolve([]),
    userId != null
      ? getAnnouncementsPage(userId, role, { limit: 10, cursor: null })
      : Promise.resolve({ rows: [], nextCursor: null }),
  ]);

  return (
    <AgendaUpdatesPageClient
      initialAgendas={initialAgendas}
      initialRows={announcements.rows}
      initialNextCursor={announcements.nextCursor}
      initialTab={initialTab}
    />
  );
}
