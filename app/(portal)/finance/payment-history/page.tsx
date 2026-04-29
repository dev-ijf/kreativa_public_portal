import { redirect } from 'next/navigation';
import { PaymentHistoryPageClient } from '@/components/portal/pages/PaymentHistoryPageClient';
import { getCachedServerSession } from '@/lib/auth-cached';
import { getPortalChildren } from '@/lib/data/server/children';
import {
  getPendingCheckoutTransactionsForPortal,
  getTuitionTransactionsForPortal,
} from '@/lib/data/server/finance-transactions';
import type { PortalTuitionTransaction } from '@/lib/data/server/finance-transactions';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const session = await getCachedServerSession();
  if (session?.user?.userId == null) {
    redirect('/login');
  }

  const children = await getPortalChildren(session.user.userId, session.user.role);
  const initialPaidByChildId: Record<number, PortalTuitionTransaction[]> = {};
  const initialPendingByChildId: Record<number, PortalTuitionTransaction[]> = {};

  await Promise.all(
    children.map(async (c) => {
      const [paid, pending] = await Promise.all([
        getTuitionTransactionsForPortal(session.user.userId, session.user.role, c.id),
        getPendingCheckoutTransactionsForPortal(session.user.userId, session.user.role, c.id),
      ]);
      initialPaidByChildId[c.id] = paid ?? [];
      initialPendingByChildId[c.id] = pending ?? [];
    }),
  );

  return (
    <PaymentHistoryPageClient
      initialPaidByChildId={initialPaidByChildId}
      initialPendingByChildId={initialPendingByChildId}
    />
  );
}
