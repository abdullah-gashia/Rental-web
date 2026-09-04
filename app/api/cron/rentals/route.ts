import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import {
  processOverdueRentals,
  autoExpireRentalRequests,
  sendRentalReminders,
} from "@/lib/cron/rental";

// Secured by CRON_SECRET — call this every hour via Vercel Cron or an external
// scheduler. Prefer the header form:
//   curl -H "Authorization: Bearer $CRON_SECRET" https://.../api/cron/rentals
// The ?secret= form still works for schedulers that cannot send headers, but a
// query string is written to access logs and referrers, so it is second choice.
//
// vercel.json: { "crons": [{ "path": "/api/cron/rentals", "schedule": "0 * * * *" }] }

/** Constant-time compare so the secret cannot be guessed a character at a time. */
function secretMatches(provided: string | null, expected: string): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET;

  // Fail closed. An unset secret used to mean "?secret=" alone let anyone in.
  if (!expected) {
    console.error("[cron/rentals] CRON_SECRET is not set — refusing to run");
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const header = req.headers.get("authorization");
  const bearer = header?.startsWith("Bearer ") ? header.slice(7) : null;
  const query  = req.nextUrl.searchParams.get("secret");

  if (!secretMatches(bearer, expected) && !secretMatches(query, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [overdue, expired, reminders] = await Promise.all([
      processOverdueRentals(),
      autoExpireRentalRequests(),
      sendRentalReminders(),
    ]);

    return NextResponse.json({
      ok: true,
      overdueProcessed: overdue.processed,
      requestsExpired:  expired.expired,
      remindersSent:    reminders.sent,
      timestamp:        new Date().toISOString(),
    });
  } catch (err: unknown) {
    // The message can carry connection strings and row data — log it, don't
    // hand it to whoever called the endpoint.
    console.error("[cron/rentals]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
