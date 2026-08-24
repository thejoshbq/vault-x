export type CurrencyCode = "USD" | "EUR" | "GBP" | "CAD" | "AUD";

export type AccountType =
  | "checking"
  | "savings"
  | "cash"
  | "credit"
  | "investment"
  | "loan";

export type TransactionKind = "income" | "expense" | "transfer";
export type RecurrenceUnit = "weekly" | "monthly" | "quarterly" | "yearly";
export type ReceiptStatus =
  | "uploaded"
  | "processing"
  | "needs_review"
  | "confirmed"
  | "failed";

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balanceMinor: number;
  currency: CurrencyCode;
  color: string;
}

export interface Category {
  id: string;
  name: string;
  kind: "income" | "expense";
  color: string;
  icon: string;
}

export interface Transaction {
  id: string;
  accountId: string;
  categoryId: string | null;
  kind: TransactionKind;
  merchant: string;
  note?: string;
  amountMinor: number;
  currency: CurrencyCode;
  occurredOn: string;
  receiptId?: string;
  status?: "posted" | "pending";
}

export interface RecurringBill {
  id: string;
  name: string;
  amountMinor: number;
  currency: CurrencyCode;
  recurrence: RecurrenceUnit;
  nextDueOn: string;
  categoryId: string | null;
  autopay: boolean;
  status: "active" | "paused";
}

export interface Budget {
  id: string;
  name: string;
  categoryId: string;
  limitMinor: number;
  spentMinor: number;
  periodStart: string;
  periodEnd: string;
}

export interface Goal {
  id: string;
  name: string;
  targetMinor: number;
  currentMinor: number;
  targetDate: string | null;
}

export interface Insight {
  id: string;
  title: string;
  body: string;
  severity: "positive" | "neutral" | "attention";
  actionLabel?: string;
  actionHref?: string;
  sourcePeriod: string;
}

export interface DashboardData {
  currency: CurrencyCode;
  monthLabel: string;
  incomeMinor: number;
  spendingMinor: number;
  projectedBillsMinor: number;
  accountBalanceMinor: number;
  budgets: Budget[];
  accounts: Account[];
  transactions: Transaction[];
  recurringBills: RecurringBill[];
  goals: Goal[];
  insights: Insight[];
  categorySpending: Array<{
    name: string;
    amountMinor: number;
    color: string;
  }>;
  monthlyTrend: Array<{
    month: string;
    incomeMinor: number;
    spendingMinor: number;
  }>;
}
