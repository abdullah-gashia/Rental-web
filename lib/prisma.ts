import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { sendNotificationEmail } from "@/lib/email";
import { decideNotificationEmail } from "@/lib/notify-policy";

type NotificationRow = {
  userId: string;
  type?: string | null;
  message: string;
  link?: string | null;
};

function createPrismaClient() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const base = new PrismaClient({ adapter });

  /**
   * Mirrors a stored notification to the user's e-mail.
   *
   * Reads through `base` rather than the extended client so it cannot recurse,
   * and swallows everything: mail is a courtesy, never a reason to fail the
   * action that produced the notification.
   */
  async function mirrorToEmail(row: NotificationRow) {
    try {
      const type = row.type ?? "SYSTEM";

      const user = await base.user.findUnique({
        where:  { id: row.userId },
        select: { email: true, preferences: true },
      });

      const decision = decideNotificationEmail({
        email:       user?.email,
        type,
        message:     row.message,
        preferences: user?.preferences,
      });
      if (!decision.email) return;

      const res = await sendNotificationEmail({
        to:      user!.email!,
        type,
        message: row.message,
        link:    row.link ?? null,
      });
      if (!res.sent) {
        console.warn("[notify] e-mail not sent:", res.reason);
      }
    } catch (e) {
      console.warn("[notify] mirror failed:", e instanceof Error ? e.message : e);
    }
  }

  /**
   * Fire-and-forget so SMTP latency never lands on the request path.
   *
   * Inside a transaction this runs before the commit is known, so a rolled-back
   * transaction can still produce an e-mail. Notifications are written at the
   * end of successful flows, which makes that rare and harmless.
   */
  function queue(row: NotificationRow) {
    void mirrorToEmail(row);
  }

  return base.$extends({
    query: {
      notification: {
        async create({ args, query }) {
          const created = await query(args);
          queue(created as unknown as NotificationRow);
          return created;
        },
        async createMany({ args, query }) {
          const result = await query(args);
          const rows = Array.isArray(args.data) ? args.data : [args.data];
          for (const row of rows) queue(row as unknown as NotificationRow);
          return result;
        },
      },
    },
  });
}

type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as unknown as {
  prisma: ExtendedPrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
