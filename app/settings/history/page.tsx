import { auth }              from "@/lib/auth";
import { redirect }          from "next/navigation";
import HistoryClient         from "./HistoryClient";
import { getUserHistory, getTrackingPreference } from "./actions";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const [historyResult, prefResult] = await Promise.all([
    getUserHistory(1, 20),
    getTrackingPreference(),
  ]);

  return (
    <HistoryClient
      initialHistory={historyResult}
      trackingEnabled={prefResult.trackingEnabled}
    />
  );
}
