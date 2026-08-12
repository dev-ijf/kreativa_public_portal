import { Suspense } from 'react';
import { LoginPageClient } from '@/components/portal/pages/LoginPageClient';
import { WhatsAppBubble } from '@/components/portal/WhatsAppBubble';
import {
  getPortalThemeForRequest,
  getDarkBgLogoUrl,
  getBrowserTitle,
  getGlobalSetting,
  getOnePortalUrl,
} from '@/lib/data/server/portal-theme';
import { getThemeWhatsappUrl } from '@/lib/data/server/school-contact';
import { resolvePortalTenantFromHost } from '@/lib/portal/tenant';

export default async function Page() {
  const [theme, globalBg] = await Promise.all([
    getPortalThemeForRequest(),
    getGlobalSetting('login_bg_url'),
  ]);

  // Only use theme.login_bg_url when it is a full HTTP URL (not a stale local path).
  const themeBg = theme.login_bg_url?.startsWith('http') ? theme.login_bg_url : null;
  const loginBgUrl = themeBg || globalBg || null;
  const tenant = resolvePortalTenantFromHost(theme.host_domain);
  const whatsappHref = await getThemeWhatsappUrl(theme.id);

  return (
    <Suspense>
      <LoginPageClient
        logoUrl={theme.logo_url}
        darkLogoUrl={getDarkBgLogoUrl(theme)}
        logoAlt={theme.portal_title}
        loginBgUrl={loginBgUrl}
        portalTitle={getBrowserTitle(theme)}
        welcomeText={theme.welcome_text}
        secondaryColor={theme.secondary_color}
        onePortalUrl={getOnePortalUrl(theme.host_domain)}
        tenant={tenant}
      />
      <WhatsAppBubble href={whatsappHref} />
    </Suspense>
  );
}

