import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { PortalProvider } from '@/components/portal/state/PortalProvider';
import { SidebarProvider } from '@/components/portal/sidebar/SidebarProvider';
import { Sidebar } from '@/components/portal/sidebar/Sidebar';
import { getCachedServerSession } from '@/lib/auth-cached';
import { getPortalChildren } from '@/lib/data/server/children';
import { getPortalThemeForRequest, getDarkBgLogoUrl } from '@/lib/data/server/portal-theme';
import { parsePortalLangCookie, PORTAL_LANG_COOKIE } from '@/lib/portal-lang-cookie';
import { getAppModules } from '@/lib/data/server/modules';
import { buildModuleActiveMap } from '@/lib/portal/menu-config';

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const session = await getCachedServerSession();
  const cookieStore = await cookies();
  const initialLang = parsePortalLangCookie(cookieStore.get(PORTAL_LANG_COOKIE)?.value);
  const theme = await getPortalThemeForRequest();

  const [portalChildren, modules] = await Promise.all([
    session?.user?.userId
      ? getPortalChildren(session.user.userId, session.user.role)
      : Promise.resolve([]),
    getAppModules(),
  ]);

  const moduleActiveMap = buildModuleActiveMap(modules);

  return (
    <AuthProvider session={session}>
      <PortalProvider initialPortalChildren={portalChildren} initialLang={initialLang}>
        <SidebarProvider>
          <div className="min-h-screen bg-slate-50 text-slate-800 md:flex">
            <Sidebar logoUrl={getDarkBgLogoUrl(theme)} logoAlt={theme.portal_title} moduleActiveMap={moduleActiveMap} />

            <div className="min-h-screen w-full flex justify-center md:flex-1 md:overflow-y-auto">
              <div className="w-full max-w-[420px] sm:border sm:border-slate-200/70 sm:shadow-sm md:max-w-none md:border-0 md:shadow-none overflow-hidden bg-slate-50">
                {children}
              </div>
            </div>
          </div>
        </SidebarProvider>
      </PortalProvider>
    </AuthProvider>
  );
}

