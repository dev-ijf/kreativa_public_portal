import { Suspense } from 'react';
import { LoginPageClient } from '@/components/portal/pages/LoginPageClient';
import { getPortalThemeForRequest, getDarkBgLogoUrl } from '@/lib/data/server/portal-theme';

export default async function Page() {
  const theme = await getPortalThemeForRequest();

  return (
    <Suspense>
      <LoginPageClient logoUrl={getDarkBgLogoUrl(theme)} logoAlt={theme.portal_title} />
    </Suspense>
  );
}

