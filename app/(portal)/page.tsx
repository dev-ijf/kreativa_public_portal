import { getServerSession } from 'next-auth';
import { HomePageClient } from '@/components/portal/pages/HomePageClient';
import { authOptions } from '@/lib/auth';
import { getAgendasForPortal } from '@/lib/data/server/agendas';
import { getAnnouncementsForPortal } from '@/lib/data/server/announcements';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.userId;
  const role = session?.user?.role ?? '';

  const initialAgendas = userId != null ? await getAgendasForPortal(userId, role) : [];
  const initialAnnouncements =
    userId != null ? await getAnnouncementsForPortal(userId, role, { limit: 5 }) : [];

  return <HomePageClient initialAgendas={initialAgendas} initialAnnouncements={initialAnnouncements} />;
}
