import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcryptjs from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { generatePassword } from "@/lib/utils/generate-password";
import { sendGeneratedPasswordEmail } from "@/lib/email";

/** Marker so the notification carrying a generated password can be found again. */
export const GENERATED_PASSWORD_NOTICE = "รหัสผ่านที่ระบบสร้างให้";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // The adapter persists Google users into User/Account. Sessions stay JWT
  // (see `session` below) because middleware.ts reads the token directly.
  adapter: PrismaAdapter(prisma),

  providers: [
    Google({
      // Any Google account may sign up — no domain restriction.
      // Left at the default (false): when the e-mail already belongs to a
      // password account, Auth.js refuses with OAuthAccountNotLinked instead
      // of silently merging, and we tell the user to use their password.
      allowDangerousEmailAccountLinking: false,
    }),
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

  events: {
    /**
     * Fires once, the first time the adapter creates a user — i.e. a brand new
     * Google sign-up. Such an account has no password, so it could never use
     * the e-mail/password form. Generate one, store the hash, and tell the
     * user what it is through the in-app notification bell.
     */
    async createUser({ user }) {
      if (!user.id) return;

      try {
        const plain = generatePassword();
        const hash  = await bcryptjs.hash(plain, 10);

        await prisma.user.update({
          where: { id: user.id },
          data:  { password: hash, emailVerified: new Date() },
        });

        await prisma.notification.create({
          data: {
            userId:  user.id,
            type:    "SYSTEM",
            link:    "/settings?tab=profile",
            message:
              `${GENERATED_PASSWORD_NOTICE} — ชื่อผู้ใช้: ${user.email} · ` +
              `รหัสผ่าน: ${plain} · กรุณาเปลี่ยนรหัสผ่านใหม่ที่หน้าการตั้งค่า ` +
              `(ข้อความนี้จะถูกลบอัตโนมัติเมื่อคุณเปลี่ยนรหัสผ่านแล้ว)`,
          },
        });

        // Same details by e-mail. Deliberately not awaited into the failure
        // path: sendGeneratedPasswordEmail never throws, and the notification
        // above already guarantees the user can find their password.
        if (user.email) {
          const mail = await sendGeneratedPasswordEmail(user.email, plain);
          if (!mail.sent) {
            console.warn("[auth] welcome e-mail not sent:", mail.reason);
          }
        }
      } catch {
        // A failure here must not block the sign-in itself — the user can
        // still get in with Google and set a password later.
      }
    },
  },

  callbacks: {
    /** Banned users are turned away before a session is ever issued. */
    async signIn({ user }) {
      if (!user?.email) return true;

      const existing = await prisma.user.findUnique({
        where:  { email: user.email },
        select: { isBanned: true },
      });
      if (existing?.isBanned) return false;

      return true;
    },

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
    // OAuth failures (notably OAuthAccountNotLinked) come back to the home
    // page as ?error=… so HomeClient can explain them in Thai.
    error:  "/",
  },
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET || "dev-secret-change-in-production",
});
