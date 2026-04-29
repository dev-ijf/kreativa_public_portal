import { cookies } from 'next/headers';
import { FullPageBlockingLoader } from '@/components/portal/FullPageBlockingLoader';
import { parsePortalLangCookie, PORTAL_LANG_COOKIE } from '@/lib/portal-lang-cookie';

export default async function PastDueLoading() {
  const cookieStore = await cookies();
  const lang = parsePortalLangCookie(cookieStore.get(PORTAL_LANG_COOKIE)?.value) ?? 'id';
  const title = lang === 'en' ? 'Loading past due bills…' : 'Memuat tunggakan…';
  const subtitle =
    lang === 'en'
      ? 'Please wait. Do not close or refresh this page.'
      : 'Mohon tunggu. Jangan tutup atau segarkan halaman ini.';

  return <FullPageBlockingLoader title={title} subtitle={subtitle} />;
}
