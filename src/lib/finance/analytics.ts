import type { DashboardData, Transaction } from "@/lib/domain";
import { recurringBurden } from "./recurrence";

export interface FinancialSnapshot {
  period: string;
  expectedIncomeMinor: number;
  plannedSpendingMinor: number;
  plannedMarginMinor: number;
  incomeMinor: number;
  spendingMinor: number;
  surplusMinor: number;
  savingsRate: number;
  recurringBurdenMinor: number;
  recurringShare: number;
  emergencyRunwayMonths: number;
  setupReviewCount: number;
  budgetUtilization: Array<{ name: string; percent: number }>;
  topCategories: Array<{ name: string; amountMinor: number }>;
}

export function aggregateTransactions(transactions: Transaction[]) {
  return transactions.reduce(
    (summary, transaction) => {
      if (transaction.kind === "income") summary.incomeMinor += transaction.amountMinor;
      if (transaction.kind === "expense") summary.spendingMinor += transaction.amountMinor;
      return summary;
    },
    { incomeMinor: 0, spendingMinor: 0 },
  );
}

export function createFinancialSnapshot(data: DashboardData): FinancialSnapshot {
  const surplusMinor = data.incomeMinor - data.spendingMinor;
  return {
    period: data.monthLabel,
    expectedIncomeMinor: data.expectedIncomeMinor,
    plannedSpendingMinor: data.plannedSpendingMinor,
    plannedMarginMinor: data.plannedMarginMinor,
    incomeMinor: data.incomeMinor,
    spendingMinor: data.spendingMinor,
    surplusMinor,
    savingsRate: data.incomeMinor ? Math.round((surplusMinor / data.incomeMinor) * 100) : 0,
    recurringBurdenMinor: recurringBurden(data.recurringBills),
    recurringShare: data.expectedIncomeMinor
      ? Math.round((recurringBurden(data.recurringBills) / data.expectedIncomeMinor) * 100)
      : 0,
    emergencyRunwayMonths: data.emergencyRunwayMonths,
    setupReviewCount: data.setupReviewCount,
    budgetUtilization: data.budgets.map((budget) => ({
      name: budget.name,
      percent: budget.limitMinor
        ? Math.round((budget.spentMinor / budget.limitMinor) * 100)
        : 0,
    })),
    topCategories: [...data.categorySpending]
      .sort((a, b) => b.amountMinor - a.amountMinor)
      .slice(0, 5)
      .map(({ name, amountMinor }) => ({ name, amountMinor })),
  };
}

export function projectScenario(
  startingMinor: number,
  monthlyIncomeMinor: number,
  monthlySpendingMinor: number,
  months: number,
) {
  return Array.from({ length: months }, (_, index) => ({
    month: index + 1,
    balanceMinor: startingMinor + (monthlyIncomeMinor - monthlySpendingMinor) * (index + 1),
  }));
}
