import { Suspense } from 'react';
import { LoginPageClient } from '@/components/portal/pages/LoginPageClient';
import { getPortalThemeForRequest, getDarkBgLogoUrl, getGlobalSetting } from '@/lib/data/server/portal-theme';

export default async function Page() {
  const [theme, globalBg] = await Promise.all([
    getPortalThemeForRequest(),
    getGlobalSetting('login_bg_url'),
  ]);

  // Only use theme.login_bg_url when it is a full HTTP URL (not a stale local path).
  const themeBg = theme.login_bg_url?.startsWith('http') ? theme.login_bg_url : null;
  const loginBgUrl = themeBg || globalBg || null;

  return (
    <Suspense>
      <LoginPageClient
        logoUrl={theme.logo_url}
        darkLogoUrl={getDarkBgLogoUrl(theme)}
        logoAlt={theme.portal_title}
        loginBgUrl={loginBgUrl}
        portalTitle={theme.portal_title}
        welcomeText={theme.welcome_text}
      />
    </Suspense>
  );
}

