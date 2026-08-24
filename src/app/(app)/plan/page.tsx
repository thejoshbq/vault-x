import { PlanView } from "@/features/planning/plan-view";
import { getDashboardData } from "@/lib/data/dashboard";
import { getExpenseCategories } from "@/lib/data/household";

export const metadata = { title: "Plan" };

export default async function PlanPage() {
  const [data, categories] = await Promise.all([getDashboardData(), getExpenseCategories()]);
  return <PlanView data={data} categories={categories} />;
}
