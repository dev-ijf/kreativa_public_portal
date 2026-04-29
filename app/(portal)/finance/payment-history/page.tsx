import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { PaymentHistoryPageClient } from '@/components/portal/pages/PaymentHistoryPageClient';
import { authOptions } from '@/lib/auth';
import { getPortalChildren } from '@/lib/data/server/children';
import { getTuitionTransactionsForPortal } from '@/lib/data/server/finance-transactions';
import type { PortalTuitionTransaction } from '@/lib/data/server/finance-transactions';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const session = await getServerSession(authOptions);
  if (session?.user?.userId == null) {
    redirect('/login');
  }

  const children = await getPortalChildren(session.user.userId, session.user.role);
  const initialByChildId: Record<number, PortalTuitionTransaction[]> = {};
  for (const c of children) {
    const txs = await getTuitionTransactionsForPortal(session.user.userId, session.user.role, c.id);
    initialByChildId[c.id] = txs ?? [];
  }

  return <PaymentHistoryPageClient initialByChildId={initialByChildId} />;
}
