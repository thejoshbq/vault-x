import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import type { CurrencyCode, DashboardData } from "@/lib/domain";
import { isDemoMode } from "@/lib/env";
import { demoDashboard } from "./demo";
import { getCurrentHouseholdId } from "./household";
import { createClient } from "@/lib/supabase/server";

export async function getDashboardData(): Promise<DashboardData> {
  if (isDemoMode) return demoDashboard;
  const supabase = await createClient();
  const householdId = await getCurrentHouseholdId();
  if (!supabase || !householdId) return { ...demoDashboard, insights: [] };

  const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(new Date()), "yyyy-MM-dd");

  const [householdResult, accountsResult, transactionsResult, billsResult, budgetsResult, goalsResult, insightsResult] =
    await Promise.all([
      supabase.from("households").select("currency").eq("id", householdId).single(),
      supabase.from("accounts").select("*").eq("household_id", householdId).eq("is_archived", false),
      supabase.from("transactions").select("*").eq("household_id", householdId).gte("occurred_on", format(subMonths(new Date(), 6), "yyyy-MM-dd")).order("occurred_on", { ascending: false }),
      supabase.from("recurring_bills").select("*").eq("household_id", householdId).order("next_due_on"),
      supabase.from("budgets").select("*").eq("household_id", householdId).lte("period_start", monthEnd).gte("period_end", monthStart),
      supabase.from("goals").select("*").eq("household_id", householdId),
      supabase.from("insights").select("*").eq("household_id", householdId).is("dismissed_at", null).order("created_at", { ascending: false }).limit(5),
    ]);

  const currency = (householdResult.data?.currency ?? "USD") as CurrencyCode;
  const allTransactions = transactionsResult.data ?? [];
  const current = allTransactions.filter(
    (transaction) =>
      transaction.occurred_on >= monthStart && transaction.occurred_on <= monthEnd,
  );
  const incomeMinor = current
    .filter((transaction) => transaction.kind === "income")
    .reduce((sum, transaction) => sum + transaction.amount_minor, 0);
  const spendingMinor = current
    .filter((transaction) => transaction.kind === "expense")
    .reduce((sum, transaction) => sum + transaction.amount_minor, 0);

  const categories = new Map<string, number>();
  current
    .filter((transaction) => transaction.kind === "expense")
    .forEach((transaction) => {
      const key = transaction.category_id ?? "Uncategorized";
      categories.set(key, (categories.get(key) ?? 0) + transaction.amount_minor);
    });

  return {
    currency,
    monthLabel: format(new Date(), "MMMM yyyy"),
    incomeMinor,
    spendingMinor,
    projectedBillsMinor: (billsResult.data ?? [])
      .filter((bill) => bill.status === "active" && bill.next_due_on <= monthEnd)
      .reduce((sum, bill) => sum + bill.amount_minor, 0),
    accountBalanceMinor: (accountsResult.data ?? []).reduce(
      (sum, account) => sum + account.balance_minor,
      0,
    ),
    accounts: (accountsResult.data ?? []).map((account) => ({
      id: account.id,
      name: account.name,
      type: account.type as DashboardData["accounts"][number]["type"],
      balanceMinor: account.balance_minor,
      currency: account.currency as CurrencyCode,
      color: account.color,
    })),
    transactions: allTransactions.slice(0, 50).map((transaction) => ({
      id: transaction.id,
      accountId: transaction.account_id,
      categoryId: transaction.category_id,
      kind: transaction.kind,
      merchant: transaction.merchant,
      note: transaction.note ?? undefined,
      amountMinor: transaction.amount_minor,
      currency: transaction.currency as CurrencyCode,
      occurredOn: transaction.occurred_on,
      receiptId: transaction.receipt_id ?? undefined,
      status: transaction.status,
    })),
    recurringBills: (billsResult.data ?? []).map((bill) => ({
      id: bill.id,
      name: bill.name,
      amountMinor: bill.amount_minor,
      currency: bill.currency as CurrencyCode,
      recurrence: bill.recurrence as DashboardData["recurringBills"][number]["recurrence"],
      nextDueOn: bill.next_due_on,
      categoryId: bill.category_id,
      autopay: bill.autopay,
      status: bill.status,
    })),
    budgets: (budgetsResult.data ?? []).map((budget) => ({
      id: budget.id,
      name: budget.name,
      categoryId: budget.category_id,
      limitMinor: budget.limit_minor,
      spentMinor: categories.get(budget.category_id) ?? 0,
      periodStart: budget.period_start,
      periodEnd: budget.period_end,
    })),
    goals: (goalsResult.data ?? []).map((goal) => ({
      id: goal.id,
      name: goal.name,
      targetMinor: goal.target_minor,
      currentMinor: goal.current_minor,
      targetDate: goal.target_date,
    })),
    insights: (insightsResult.data ?? []).map((insight) => ({
      id: insight.id,
      title: insight.title,
      body: insight.body,
      severity: insight.severity as DashboardData["insights"][number]["severity"],
      actionLabel: insight.action_label ?? undefined,
      actionHref: insight.action_href ?? undefined,
      sourcePeriod: insight.source_period,
    })),
    categorySpending: [...categories.entries()].map(([name, amountMinor], index) => ({
      name,
      amountMinor,
      color: ["#285d52", "#d19b52", "#b97053", "#6f8e63", "#9c9485"][index % 5],
    })),
    monthlyTrend: Array.from({ length: 6 }, (_, index) => {
      const date = subMonths(new Date(), 5 - index);
      const start = format(startOfMonth(date), "yyyy-MM-dd");
      const end = format(endOfMonth(date), "yyyy-MM-dd");
      const rows = allTransactions.filter(
        (transaction) => transaction.occurred_on >= start && transaction.occurred_on <= end,
      );
      return {
        month: format(date, "MMM"),
        incomeMinor: rows.filter((transaction) => transaction.kind === "income").reduce((sum, transaction) => sum + transaction.amount_minor, 0),
        spendingMinor: rows.filter((transaction) => transaction.kind === "expense").reduce((sum, transaction) => sum + transaction.amount_minor, 0),
      };
    }),
  };
}
