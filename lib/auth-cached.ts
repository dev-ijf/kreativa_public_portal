import { cache } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/** Satu decode session per request RSC (dedup dengan layout + page). */
export const getCachedServerSession = cache(() => getServerSession(authOptions));
