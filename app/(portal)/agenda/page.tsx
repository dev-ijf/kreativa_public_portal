import { getServerSession } from 'next-auth';
import { AgendaPageClient } from '@/components/portal/pages/AgendaPageClient';
import { authOptions } from '@/lib/auth';
import { getAgendasForPortal } from '@/lib/data/server/agendas';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.userId;
  const role = session?.user?.role ?? '';

  const initialAgendas =
    userId != null ? await getAgendasForPortal(userId, role) : [];

  return <AgendaPageClient initialAgendas={initialAgendas} />;
}
