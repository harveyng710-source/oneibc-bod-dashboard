/**
 * page.tsx — Root page (server component)
 * ─────────────────────────────────────────
 * Loads dashboard data on the server, then passes it to the
 * client-side BODDashboard component for interactive rendering.
 */

import { loadDashboardData } from "@/lib/dataLoader";
import { logAccess } from "@/lib/settingsStore";
import BODDashboard from "@/components/BODDashboard";

export const dynamic = "force-dynamic"; // always fetch fresh data

export default async function HomePage() {
  const data = await loadDashboardData();
  await logAccess("dashboard.view", data.source ?? "static");
  return <BODDashboard initialData={data} />;
}
