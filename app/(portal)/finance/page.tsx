import { FinancePageClient } from '@/components/portal/pages/FinancePageClient';
import { getCachedServerSession } from '@/lib/auth-cached';
import { getPortalChildren } from '@/lib/data/server/children';
import { getFinanceDashboardForPortal } from '@/lib/data/server/finance';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const session = await getCachedServerSession();
  const children =
    session?.user?.userId != null
      ? await getPortalChildren(session.user.userId, session.user.role)
      : [];
  const financeByChildId =
    session?.user?.userId != null && children.length > 0
      ? await getFinanceDashboardForPortal(session.user.userId, session.user.role, children)
      : {};

  return <FinancePageClient financeByChildId={financeByChildId} />;
}
