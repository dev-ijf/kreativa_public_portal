import { Suspense } from 'react';
import { LoginPageClient } from '@/components/portal/pages/LoginPageClient';
import { getPortalThemeForRequest } from '@/lib/data/server/portal-theme';

export default async function Page() {
  const theme = await getPortalThemeForRequest();

  return (
    <Suspense>
      <LoginPageClient logoUrl={theme.logo_url} logoAlt={theme.portal_title} />
    </Suspense>
  );
}

