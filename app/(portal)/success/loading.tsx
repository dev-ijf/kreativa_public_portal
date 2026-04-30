import { cookies } from 'next/headers';
import { FullPageBlockingLoader } from '@/components/portal/FullPageBlockingLoader';
import { parsePortalLangCookie, PORTAL_LANG_COOKIE } from '@/lib/portal-lang-cookie';

export default async function SuccessLoading() {
  const cookieStore = await cookies();
  const lang = parsePortalLangCookie(cookieStore.get(PORTAL_LANG_COOKIE)?.value) ?? 'id';
  const title = lang === 'en' ? 'Loading…' : 'Memuat…';
  const subtitle =
    lang === 'en'
      ? 'Please wait.'
      : 'Mohon tunggu.';

  return <FullPageBlockingLoader title={title} subtitle={subtitle} />;
}
