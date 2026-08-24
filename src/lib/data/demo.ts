import type { DashboardData } from "@/lib/domain";

export const demoDashboard: DashboardData = {
  currency: "USD",
  monthLabel: "August 2026",
  incomeMinor: 642500,
  spendingMinor: 398760,
  projectedBillsMinor: 126400,
  accountBalanceMinor: 1842350,
  accounts: [
    { id: "checking", name: "Everyday checking", type: "checking", balanceMinor: 624350, currency: "USD", color: "#285d52" },
    { id: "savings", name: "Emergency fund", type: "savings", balanceMinor: 1048000, currency: "USD", color: "#487654" },
    { id: "credit", name: "Rewards card", type: "credit", balanceMinor: -170000, currency: "USD", color: "#9a5d44" },
  ],
  budgets: [
    { id: "b1", name: "Groceries", categoryId: "groceries", limitMinor: 65000, spentMinor: 48240, periodStart: "2026-08-01", periodEnd: "2026-08-31" },
    { id: "b2", name: "Dining", categoryId: "dining", limitMinor: 30000, spentMinor: 26750, periodStart: "2026-08-01", periodEnd: "2026-08-31" },
    { id: "b3", name: "Transport", categoryId: "transport", limitMinor: 40000, spentMinor: 22100, periodStart: "2026-08-01", periodEnd: "2026-08-31" },
  ],
  transactions: [
    { id: "t1", accountId: "checking", categoryId: "income", kind: "income", merchant: "Acme Payroll", amountMinor: 321250, currency: "USD", occurredOn: "2026-08-22", status: "posted" },
    { id: "t2", accountId: "credit", categoryId: "groceries", kind: "expense", merchant: "Green Market", amountMinor: 8634, currency: "USD", occurredOn: "2026-08-23", status: "posted", receiptId: "receipt-demo" },
    { id: "t3", accountId: "credit", categoryId: "dining", kind: "expense", merchant: "Sunday Table", amountMinor: 4890, currency: "USD", occurredOn: "2026-08-21", status: "posted" },
    { id: "t4", accountId: "checking", categoryId: "utilities", kind: "expense", merchant: "City Electric", amountMinor: 13742, currency: "USD", occurredOn: "2026-08-20", status: "posted" },
    { id: "t5", accountId: "credit", categoryId: "transport", kind: "expense", merchant: "Metro Fuel", amountMinor: 4238, currency: "USD", occurredOn: "2026-08-18", status: "posted" },
  ],
  recurringBills: [
    { id: "r1", name: "Rent", amountMinor: 160000, currency: "USD", recurrence: "monthly", nextDueOn: "2026-09-01", categoryId: "housing", autopay: true, status: "active" },
    { id: "r2", name: "Auto insurance", amountMinor: 17800, currency: "USD", recurrence: "monthly", nextDueOn: "2026-08-28", categoryId: "insurance", autopay: true, status: "active" },
    { id: "r3", name: "Cloud storage", amountMinor: 1199, currency: "USD", recurrence: "monthly", nextDueOn: "2026-08-30", categoryId: "subscriptions", autopay: true, status: "active" },
  ],
  goals: [
    { id: "g1", name: "Emergency fund", targetMinor: 1500000, currentMinor: 1048000, targetDate: "2027-03-01" },
  ],
  insights: [
    { id: "i1", title: "Dining is nearing its limit", body: "You have used 89% of the dining budget with one week left. Keeping the next seven days under $32 will preserve the plan.", severity: "attention", actionLabel: "Review dining", actionHref: "/transactions?category=dining", sourcePeriod: "August 2026" },
    { id: "i2", title: "Cash flow is on track", body: "After upcoming bills, this month is projected to close with a $1,173 surplus.", severity: "positive", actionLabel: "Explore a scenario", actionHref: "/plan", sourcePeriod: "August 2026" },
  ],
  categorySpending: [
    { name: "Housing", amountMinor: 160000, color: "#285d52" },
    { name: "Groceries", amountMinor: 48240, color: "#d19b52" },
    { name: "Dining", amountMinor: 26750, color: "#b97053" },
    { name: "Transport", amountMinor: 22100, color: "#6f8e63" },
    { name: "Other", amountMinor: 141670, color: "#9c9485" },
  ],
  monthlyTrend: [
    { month: "Mar", incomeMinor: 610000, spendingMinor: 432000 },
    { month: "Apr", incomeMinor: 610000, spendingMinor: 458000 },
    { month: "May", incomeMinor: 622000, spendingMinor: 412000 },
    { month: "Jun", incomeMinor: 622000, spendingMinor: 439000 },
    { month: "Jul", incomeMinor: 642500, spendingMinor: 421000 },
    { month: "Aug", incomeMinor: 642500, spendingMinor: 398760 },
  ],
};
