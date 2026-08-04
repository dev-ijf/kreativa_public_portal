import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { PortalProvider } from '@/components/portal/state/PortalProvider';
import { SidebarProvider } from '@/components/portal/sidebar/SidebarProvider';
import { Sidebar } from '@/components/portal/sidebar/Sidebar';
import { WhatsAppBubble } from '@/components/portal/WhatsAppBubble';
import { getCachedServerSession } from '@/lib/auth-cached';
import { getPortalChildren } from '@/lib/data/server/children';
import {
  getPortalThemeForRequest,
  getDarkBgLogoUrl,
} from '@/lib/data/server/portal-theme';
import { getSchoolWhatsappUrlsByIds } from '@/lib/data/server/school-contact';
import { parsePortalLangCookie, PORTAL_LANG_COOKIE } from '@/lib/portal-lang-cookie';
import { getSchoolModuleActiveMaps } from '@/lib/data/server/modules';

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const session = await getCachedServerSession();
  const cookieStore = await cookies();
  const initialLang = parsePortalLangCookie(cookieStore.get(PORTAL_LANG_COOKIE)?.value);
  const theme = await getPortalThemeForRequest();

  const portalChildren = session?.user?.userId
    ? await getPortalChildren(session.user.userId, session.user.role)
    : [];

  const schoolIds = portalChildren.map((c) => c.schoolId);
  const [moduleMapsBySchool, whatsappBySchoolId] = await Promise.all([
    getSchoolModuleActiveMaps(schoolIds),
    getSchoolWhatsappUrlsByIds(schoolIds),
  ]);

  return (
    <AuthProvider session={session}>
      <PortalProvider
        initialPortalChildren={portalChildren}
        initialLang={initialLang}
        initialModuleMapsBySchool={moduleMapsBySchool}
      >
        <SidebarProvider>
          <div className="min-h-screen bg-slate-50 text-slate-800 md:flex">
            <Sidebar logoUrl={getDarkBgLogoUrl(theme)} logoAlt={theme.portal_title} />

            <div className="min-h-screen w-full flex justify-center md:flex-1 md:overflow-y-auto">
              <div className="w-full max-w-[420px] sm:border sm:border-slate-200/70 sm:shadow-sm md:max-w-none md:border-0 md:shadow-none overflow-hidden bg-slate-50">
                {children}
              </div>
            </div>
          </div>
          <WhatsAppBubble hrefBySchoolId={whatsappBySchoolId} liftForCart />
        </SidebarProvider>
      </PortalProvider>
    </AuthProvider>
  );
}
