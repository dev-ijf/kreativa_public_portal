import { Suspense } from 'react';
import { LoginPageClient } from '@/components/portal/pages/LoginPageClient';

export default function Page() {
  return (
    <Suspense>
      <LoginPageClient />
    </Suspense>
  );
}

