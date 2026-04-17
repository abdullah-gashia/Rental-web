import { NextRequest, NextResponse } from "next/server";
import {
  processOverdueRentals,
  autoExpireRentalRequests,
  sendRentalReminders,
} from "@/lib/cron/rental";

// Secured by CRON_SECRET env var — call this every hour via Vercel Cron or external scheduler
// vercel.json: { "crons": [{ "path": "/api/cron/rentals", "schedule": "0 * * * *" }] }

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
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
  } catch (err: any) {
    console.error("[cron/rentals]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
