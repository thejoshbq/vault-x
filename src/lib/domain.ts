export type CurrencyCode = "USD" | "EUR" | "GBP" | "CAD" | "AUD";

export type AccountType =
  | "checking"
  | "savings"
  | "cash"
  | "credit"
  | "investment"
  | "loan";

export type TransactionKind = "income" | "expense" | "transfer";
export type RecurrenceUnit = "weekly" | "monthly" | "quarterly" | "semiannual" | "yearly";
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
  institution?: string;
  purpose: "operating" | "income_holding" | "emergency" | "dependent_savings" | "investment" | "other";
  ownerLabel?: string;
  apy: number;
}

export interface IncomeComponent {
  id: string;
  name: string;
  type: "gross_pay" | "employee_tax" | "employee_pretax_deduction" | "employer_benefit";
  monthlyAmountMinor: number;
}

export interface IncomeSource {
  id: string;
  name: string;
  kind: "salary" | "hourly" | "other";
  grossMonthlyMinor: number;
  expectedMonthlyCashMinor: number;
  employerBenefitsMonthlyMinor: number;
  employeeTaxesMonthlyMinor: number;
  employeePretaxMonthlyMinor: number;
  hourlyRateMinor?: number;
  expectedHoursPerWeek?: number;
  variable: boolean;
  taxTreatment: "withheld" | "unwithheld" | "unknown";
  taxReservePercent: number;
  status: "active" | "paused";
  components: IncomeComponent[];
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
  incomeSourceId?: string;
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
  nextDueOn: string | null;
  categoryId: string | null;
  autopay: boolean;
  status: "active" | "paused";
  expenseType: "fixed" | "variable" | "subscription" | "insurance" | "contribution";
  billingAccountLabel?: string;
  paymentMethod?: string;
  privacyMask?: "none" | "privacy" | "virtual_card";
  essential: boolean;
  notes?: string;
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
  expectedIncomeMinor: number;
  plannedSpendingMinor: number;
  plannedMarginMinor: number;
  incomeMinor: number;
  spendingMinor: number;
  projectedBillsMinor: number;
  accountBalanceMinor: number;
  budgets: Budget[];
  accounts: Account[];
  incomeSources: IncomeSource[];
  transactions: Transaction[];
  recurringBills: RecurringBill[];
  goals: Goal[];
  insights: Insight[];
  setupReviewCount: number;
  emergencyRunwayMonths: number;
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
