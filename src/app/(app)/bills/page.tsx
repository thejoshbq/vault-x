import { BillsView } from "@/features/bills/bills-view";
import { getDashboardData } from "@/lib/data/dashboard";

export const metadata = { title: "Bills" };

export default async function BillsPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const [data, params] = await Promise.all([getDashboardData(), searchParams]);
  return <BillsView data={data} startOpen={params.new === "1"} />;
}
