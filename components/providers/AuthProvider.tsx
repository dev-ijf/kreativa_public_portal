"use client";

import type { ReactNode } from 'react';
import type { Session } from 'next-auth';
import { SessionProvider, signOut, useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

function SessionGuard({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const pathname = usePathname();
  const isPublic = pathname.startsWith('/login');

  useEffect(() => {
    if (status === 'unauthenticated' && !isPublic) {
      signOut({ callbackUrl: '/login' });
    }
  }, [status, isPublic]);

  return <>{children}</>;
}

export function AuthProvider({ children, session }: { children: ReactNode; session?: Session | null }) {
  return (
    <SessionProvider session={session ?? undefined} refetchInterval={5 * 60} refetchOnWindowFocus>
      <SessionGuard>{children}</SessionGuard>
    </SessionProvider>
  );
}
