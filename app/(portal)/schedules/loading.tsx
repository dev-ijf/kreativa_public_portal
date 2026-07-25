import { cookies } from 'next/headers';
import { SchedulesLoadingShell } from '@/components/portal/schedules/SchedulesLoadingShell';
import { parsePortalLangCookie, PORTAL_LANG_COOKIE } from '@/lib/portal-lang-cookie';

export default async function SchedulesLoading() {
  const cookieStore = await cookies();
  const lang = parsePortalLangCookie(cookieStore.get(PORTAL_LANG_COOKIE)?.value) ?? 'id';
  const title = lang === 'en' ? 'Schedules' : 'Jadwal';
  const loadingTitle = lang === 'en' ? 'Loading…' : 'Memuat…';
  const loadingSubtitle =
    lang === 'en'
      ? 'Please wait. Do not close or refresh this page.'
      : 'Mohon tunggu. Jangan tutup atau segarkan halaman ini.';

  return (
    <SchedulesLoadingShell
      title={title}
      loadingTitle={loadingTitle}
      loadingSubtitle={loadingSubtitle}
    />
  );
}
