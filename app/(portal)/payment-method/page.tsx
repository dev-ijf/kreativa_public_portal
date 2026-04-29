import { redirect } from 'next/navigation';
import { PaymentMethodPageClient } from '@/components/portal/pages/PaymentMethodPageClient';
import { getCachedServerSession } from '@/lib/auth-cached';
import { getPortalChildren } from '@/lib/data/server/children';
import { getPublishedPaymentMethodsForSchools } from '@/lib/data/server/payment-methods';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const session = await getCachedServerSession();
  if (session?.user?.userId == null) {
    redirect('/login');
  }

  const children = await getPortalChildren(session.user.userId, session.user.role);
  const schoolIds = [...new Set(children.map((c) => c.schoolId).filter((id) => Number.isFinite(id) && id > 0))];
  const initialMethods = await getPublishedPaymentMethodsForSchools(schoolIds);

  return <PaymentMethodPageClient initialMethods={initialMethods} />;
}
