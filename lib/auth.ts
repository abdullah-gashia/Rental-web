import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcryptjs from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "PSU Credentials",
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.password) return null;

        // ── Ban check: block BEFORE password verification so we don't
        //    leak "wrong password" vs "banned" timing difference
        if (user.isBanned) {
          throw new Error("ACCOUNT_BANNED");
        }

        const valid = await bcryptjs.compare(
          credentials.password as string,
          user.password
        );
        if (!valid) return null;

        return {
          id:       user.id,
          name:     user.name,
          email:    user.email,
          image:    user.image,
          role:     user.role,
          isBanned: user.isBanned,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, trigger }) {
      // On initial sign-in, copy fields from the user object
      if (user) {
        token.id       = user.id;
        token.role     = (user as any).role;
        token.isBanned = (user as any).isBanned ?? false;
        token.lastBanCheck = Date.now();
      }

      // Periodically refresh ban/role from DB (every 5 minutes).
      // This catches users who get banned WHILE already logged in.
      const FIVE_MIN = 5 * 60 * 1000;
      const lastCheck = (token.lastBanCheck as number | undefined) ?? 0;

      if (trigger === "update" || Date.now() - lastCheck > FIVE_MIN) {
        try {
          const fresh = await prisma.user.findUnique({
            where:  { id: token.id as string },
            select: { isBanned: true, role: true },
          });
          if (fresh) {
            token.isBanned = fresh.isBanned;
            token.role     = fresh.role;
          }
        } catch {
          // DB unreachable — keep existing token values; don't break the session
        }
        token.lastBanCheck = Date.now();
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id       = token.id       as string;
        (session.user as any).role     = token.role;
        (session.user as any).isBanned = token.isBanned ?? false;
      }
      return session;
    },
  },

  pages: {
    signIn: "/",
  },
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET || "dev-secret-change-in-production",
});
