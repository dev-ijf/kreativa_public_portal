import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { sql } from '@/lib/db/client';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;

      const rows = await sql`
        SELECT id, full_name, email, role
        FROM core_users
        WHERE email = ${user.email}
          AND role IN ('parent', 'student')
        LIMIT 1
      `;

      return rows.length > 0;
    },

    async jwt({ token, trigger }) {
      if (trigger === 'signIn' || (token.email && !token.userId)) {
        const rows = await sql`
          SELECT id, full_name, email, role
          FROM core_users
          WHERE email = ${token.email}
            AND role IN ('parent', 'student')
          LIMIT 1
        `;

        if (rows.length > 0) {
          const dbUser = rows[0];
          token.userId = dbUser.id as number;
          token.role = dbUser.role as string;
          token.fullName = dbUser.full_name as string;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.userId = token.userId as number;
        session.user.role = token.role as string;
        session.user.fullName = token.fullName as string;
      }
      return session;
    },
  },
};
