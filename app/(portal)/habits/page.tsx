import { headers } from 'next/headers';
import { HabitsEntryClient } from '@/components/portal/pages/HabitsEntryClient';

export default async function Page() {
  const h = await headers();
  const tenantHeader = h.get('x-tenant-id');
  const tenant = tenantHeader === 'talenta' ? 'talenta' : 'kreativa';

  return <HabitsEntryClient tenant={tenant} />;
}
