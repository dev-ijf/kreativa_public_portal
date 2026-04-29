import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { PaymentHistoryPageClient } from '@/components/portal/pages/PaymentHistoryPageClient';
import { authOptions } from '@/lib/auth';
import { getPortalChildren } from '@/lib/data/server/children';
import {
  getPendingCheckoutTransactionsForPortal,
  getTuitionTransactionsForPortal,
} from '@/lib/data/server/finance-transactions';
import type { PortalTuitionTransaction } from '@/lib/data/server/finance-transactions';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const session = await getServerSession(authOptions);
  if (session?.user?.userId == null) {
    redirect('/login');
  }

  const children = await getPortalChildren(session.user.userId, session.user.role);
  const initialPaidByChildId: Record<number, PortalTuitionTransaction[]> = {};
  const initialPendingByChildId: Record<number, PortalTuitionTransaction[]> = {};
  for (const c of children) {
    const paid = await getTuitionTransactionsForPortal(session.user.userId, session.user.role, c.id);
    const pending = await getPendingCheckoutTransactionsForPortal(session.user.userId, session.user.role, c.id);
    initialPaidByChildId[c.id] = paid ?? [];
    initialPendingByChildId[c.id] = pending ?? [];
  }

  return (
    <PaymentHistoryPageClient
      initialPaidByChildId={initialPaidByChildId}
      initialPendingByChildId={initialPendingByChildId}
    />
  );
}
