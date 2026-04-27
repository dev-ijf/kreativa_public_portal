export type Lang = 'en' | 'id';

export const PORTAL_LANG_COOKIE = 'portal.lang';

export function parsePortalLangCookie(value: string | undefined): Lang | undefined {
  if (value === 'en' || value === 'id') return value;
  return undefined;
}

/** Cookie HttpOnly=false agar JS portal bisa sinkron dengan preferensi bahasa (hidrasi + navigasi). */
export function buildPortalLangCookieValue(lang: Lang): string {
  return `${PORTAL_LANG_COOKIE}=${lang}; Path=/; Max-Age=31536000; SameSite=Lax`;
}
