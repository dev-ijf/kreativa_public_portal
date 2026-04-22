import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export type SessionUser = { userId: number; role: string; fullName: string };

export async function getSessionUser(): Promise<SessionUser> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.userId) {
    throw new Error('Unauthorized');
  }

  return {
    userId: session.user.userId,
    role: session.user.role,
    fullName: session.user.fullName,
  };
}

