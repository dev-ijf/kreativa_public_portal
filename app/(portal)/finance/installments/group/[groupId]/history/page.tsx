import { notFound, redirect } from 'next/navigation';
import { InstallmentHistoryPageClient } from '@/components/portal/pages/InstallmentHistoryPageClient';
import { getCachedServerSession } from '@/lib/auth-cached';
import { getPaymentLinesForBillGroupPortal } from '@/lib/data/server/finance-transactions';

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ groupId: string }> };

export default async function Page({ params }: PageProps) {
  const session = await getCachedServerSession();
  if (session?.user?.userId == null) {
    redirect('/login');
  }

  const { groupId: groupIdRaw } = await params;
  const groupId = Number(groupIdRaw);
  if (!Number.isFinite(groupId)) {
    notFound();
  }

  const data = await getPaymentLinesForBillGroupPortal(session.user.userId, session.user.role, groupId);
  if (!data) {
    notFound();
  }

  return <InstallmentHistoryPageClient productName={data.productName ?? `#${groupId}`} lines={data.lines} />;
}
