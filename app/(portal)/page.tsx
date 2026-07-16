import { HomePageClient } from '@/components/portal/pages/HomePageClient';
import { getCachedServerSession } from '@/lib/auth-cached';
import { getAgendasForPortal } from '@/lib/data/server/agendas';
import { getAnnouncementsForPortal } from '@/lib/data/server/announcements';
import { getPortalThemeForRequest, getDarkBgLogoUrl } from '@/lib/data/server/portal-theme';
import { getAppModules } from '@/lib/data/server/modules';
import { buildModuleActiveMap } from '@/lib/portal/menu-config';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const session = await getCachedServerSession();
  const theme = await getPortalThemeForRequest();
  const userId = session?.user?.userId;
  const role = session?.user?.role ?? '';

  const [initialAgendas, initialAnnouncements, modules] = await Promise.all([
    userId != null ? getAgendasForPortal(userId, role) : Promise.resolve([]),
    userId != null ? getAnnouncementsForPortal(userId, role, { limit: 5 }) : Promise.resolve([]),
    getAppModules(),
  ]);

  const moduleActiveMap = buildModuleActiveMap(modules);

  return (
    <HomePageClient
      logoUrl={getDarkBgLogoUrl(theme)}
      logoAlt={theme.portal_title}
      initialAgendas={initialAgendas}
      initialAnnouncements={initialAnnouncements}
      moduleActiveMap={moduleActiveMap}
    />
  );
}
