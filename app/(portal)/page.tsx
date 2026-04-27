import { getServerSession } from 'next-auth';
import { HomePageClient } from '@/components/portal/pages/HomePageClient';
import { authOptions } from '@/lib/auth';
import { getAgendasForPortal } from '@/lib/data/server/agendas';
import { getAnnouncementsForPortal } from '@/lib/data/server/announcements';
import { getPortalThemeForRequest } from '@/lib/data/server/portal-theme';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const session = await getServerSession(authOptions);
  const theme = await getPortalThemeForRequest();
  const userId = session?.user?.userId;
  const role = session?.user?.role ?? '';

  const initialAgendas = userId != null ? await getAgendasForPortal(userId, role) : [];
  const initialAnnouncements =
    userId != null ? await getAnnouncementsForPortal(userId, role, { limit: 5 }) : [];

  return (
    <HomePageClient
      logoUrl={theme.logo_url}
      logoAlt={theme.portal_title}
      initialAgendas={initialAgendas}
      initialAnnouncements={initialAnnouncements}
    />
  );
}
