import { InsightsView } from "@/features/insights/insights-view";
import { getDashboardData } from "@/lib/data/dashboard";

export const metadata = { title: "Insights" };

export default async function InsightsPage() {
  const data = await getDashboardData();
  return <InsightsView data={data} />;
}
