import { redirect } from 'next/navigation';
import { FinancePastDuePageClient } from '@/components/portal/pages/FinancePastDuePageClient';
import { getCachedServerSession } from '@/lib/auth-cached';
import { getPortalChildren } from '@/lib/data/server/children';
import { getFinanceDashboardForPortal } from '@/lib/data/server/finance';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const session = await getCachedServerSession();
  if (session?.user?.userId == null) {
    redirect('/login');
  }

  const children = await getPortalChildren(session.user.userId, session.user.role);
  const financeByChildId =
    children.length > 0
      ? await getFinanceDashboardForPortal(session.user.userId, session.user.role, children)
      : {};

  return <FinancePastDuePageClient financeByChildId={financeByChildId} />;
}
