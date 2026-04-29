import { notFound } from 'next/navigation';
import { UpdateDetailPageClient } from '@/components/portal/pages/UpdateDetailPageClient';
import { getCachedServerSession } from '@/lib/auth-cached';
import { getAnnouncementByIdForPortal } from '@/lib/data/server/announcements';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  const session = await getCachedServerSession();
  const userId = session?.user?.userId;
  const role = session?.user?.role ?? '';

  if (userId == null) {
    notFound();
  }

  const announcement = await getAnnouncementByIdForPortal(userId, role, id);
  if (!announcement) {
    notFound();
  }

  return <UpdateDetailPageClient announcement={announcement} />;
}
