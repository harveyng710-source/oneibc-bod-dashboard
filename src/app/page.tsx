/**
 * page.tsx — Root page (server component)
 * ─────────────────────────────────────────
 * Loads dashboard data on the server, then passes it to the
 * client-side BODDashboard component for interactive rendering.
 */

import { loadDashboardData } from "@/lib/dataLoader";
import BODDashboard from "@/components/BODDashboard";

export const dynamic = "force-dynamic"; // always fetch fresh data

export default async function HomePage() {
  const data = await loadDashboardData();
  return <BODDashboard initialData={data} />;
}
