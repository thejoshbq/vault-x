import { TransactionsWorkspace } from "@/features/transactions/transactions-workspace";
import { getDashboardData } from "@/lib/data/dashboard";
import { getCurrentHouseholdId, getExpenseCategories } from "@/lib/data/household";

export const metadata = { title: "Transactions" };

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string; receipt?: string }>;
}) {
  const [data, params, householdId, categories] = await Promise.all([
    getDashboardData(),
    searchParams,
    getCurrentHouseholdId(),
    getExpenseCategories(),
  ]);
  return (
    <TransactionsWorkspace
      data={data}
      householdId={householdId}
      categories={categories}
      startNew={params.new === "1"}
      startReceipt={params.receipt === "1"}
    />
  );
}
