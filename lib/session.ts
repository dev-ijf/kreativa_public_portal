import { getCachedServerSession } from '@/lib/auth-cached';

export type SessionUser = { userId: number; role: string; fullName: string };

export async function getSessionUser(): Promise<SessionUser> {
  const session = await getCachedServerSession();

  if (!session?.user?.userId) {
    throw new Error('Unauthorized');
  }

  return {
    userId: session.user.userId,
    role: session.user.role,
    fullName: session.user.fullName,
  };
}

