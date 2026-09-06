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

function createBaseClient() {
  /**
   * Neon suspends the compute when nothing has touched it for a few minutes,
   * and the first request after that has to wait for it to wake. With the
   * defaults that showed up as "Connection terminated unexpectedly": the page
   * sat for twenty seconds and then failed, while the request before and after
   * it took one second each.
   *
   * So: give a cold start room to finish, keep the socket alive so an idle one
   * is not quietly dropped in between, and let the pool retire its own idle
   * clients before the server does — a connection the server has already
   * closed looks fine to the pool until someone tries to use it.
   */
  const pool = new Pool({
    connectionString:        process.env.DATABASE_URL,
    max:                     5,
    connectionTimeoutMillis: 30_000,   // a cold start can take twenty
    idleTimeoutMillis:       20_000,   // shorter than the server's own cutoff
    keepAlive:               true,
    keepAliveInitialDelayMillis: 5_000,
  });

  // An idle client dropped by the server emits here. Without a listener that
  // is an unhandled error event, which takes the whole process down.
  pool.on("error", (e) => {
    console.warn("[db] idle client dropped:", e instanceof Error ? e.message : e);
  });

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

function withNotificationMail(base: PrismaClient) {
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

type ExtendedPrismaClient = ReturnType<typeof withNotificationMail>;

const globalForPrisma = globalThis as unknown as {
  prismaBase: PrismaClient | undefined;
  prisma:     ExtendedPrismaClient | undefined;
};

const base = globalForPrisma.prismaBase ?? createBaseClient();

/**
 * The same database, without the notification → e-mail mirror.
 *
 * Only for code that has already sent the mail itself; writing a notification
 * through the normal client would then deliver a second copy. Everything else
 * should use `prisma`.
 */
export const prismaNoMail = base;

export const prisma = globalForPrisma.prisma ?? withNotificationMail(base);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaBase = base;
  globalForPrisma.prisma     = prisma;
}
