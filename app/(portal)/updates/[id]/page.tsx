import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { UpdateDetailPageClient } from '@/components/portal/pages/UpdateDetailPageClient';
import { authOptions } from '@/lib/auth';
import { getAnnouncementByIdForPortal } from '@/lib/data/server/announcements';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
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
