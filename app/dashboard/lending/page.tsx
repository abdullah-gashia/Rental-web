import { redirect } from "next/navigation";

// The P2P lending system has been unified into the marketplace rental system.
// All rental activity is now at /dashboard/rentals.
export default function LendingDashboardRedirect() {
  redirect("/dashboard/rentals");
}
