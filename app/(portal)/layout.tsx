import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { PortalProvider } from '@/components/portal/state/PortalProvider';
import { authOptions } from '@/lib/auth';
import { getPortalChildren } from '@/lib/data/server/children';
import { parsePortalLangCookie, PORTAL_LANG_COOKIE } from '@/lib/portal-lang-cookie';

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  const cookieStore = await cookies();
  const initialLang = parsePortalLangCookie(cookieStore.get(PORTAL_LANG_COOKIE)?.value);

  const portalChildren =
    session?.user?.userId
      ? await getPortalChildren(session.user.userId, session.user.role)
      : [];

  return (
    <AuthProvider session={session}>
      <PortalProvider initialPortalChildren={portalChildren} initialLang={initialLang}>
        <div className="min-h-screen bg-slate-50 text-slate-800">
          <div className="min-h-screen w-full flex justify-center">
            <div className="w-full max-w-[420px] sm:border sm:border-slate-200/70 sm:shadow-sm overflow-hidden bg-slate-50">
              {children}
            </div>
          </div>
        </div>
      </PortalProvider>
    </AuthProvider>
  );
}

