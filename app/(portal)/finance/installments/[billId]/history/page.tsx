import { notFound, redirect } from 'next/navigation';
import { InstallmentHistoryPageClient } from '@/components/portal/pages/InstallmentHistoryPageClient';
import { getCachedServerSession } from '@/lib/auth-cached';
import { getPaymentLinesForBillPortal } from '@/lib/data/server/finance-transactions';

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ billId: string }> };

export default async function Page({ params }: PageProps) {
  const session = await getCachedServerSession();
  if (session?.user?.userId == null) {
    redirect('/login');
  }

  const { billId: billIdRaw } = await params;
  const billId = Number(billIdRaw);
  if (!Number.isFinite(billId)) {
    notFound();
  }

  const data = await getPaymentLinesForBillPortal(session.user.userId, session.user.role, billId);
  if (!data) {
    notFound();
  }

  return <InstallmentHistoryPageClient productName={data.productName ?? `#${billId}`} lines={data.lines} />;
}
