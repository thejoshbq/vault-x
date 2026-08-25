import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { cookies } from "next/headers";
import type { CurrencyCode, DashboardData } from "@/lib/domain";
import { isDemoMode } from "@/lib/env";
import { demoDashboard } from "./demo";
import { getCurrentHouseholdId } from "./household";
import { createClient } from "@/lib/supabase/server";
import { monthlyEquivalent, recurringBurden } from "@/lib/finance/recurrence";
import {
  applyDemoBills,
  applyDemoPlan,
  DEMO_BILLS_COOKIE,
  DEMO_PLAN_COOKIE,
  readDemoState,
  type DemoBillsState,
  type DemoPlanState,
} from "./demo-state";

export async function getDashboardData(): Promise<DashboardData> {
  if (isDemoMode) return getDemoDashboard();
  const supabase = await createClient();
  const householdId = await getCurrentHouseholdId();
  if (!supabase || !householdId) return { ...demoDashboard, insights: [] };

  const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(new Date()), "yyyy-MM-dd");

  const [householdResult, accountsResult, incomeSourcesResult, incomeComponentsResult, transactionsResult, billsResult, budgetsResult, goalsResult, insightsResult] =
    await Promise.all([
      supabase.from("households").select("currency").eq("id", householdId).single(),
      supabase.from("accounts").select("*").eq("household_id", householdId).eq("is_archived", false),
      supabase.from("income_sources").select("*").eq("household_id", householdId).order("variable"),
      supabase.from("income_components").select("*").eq("household_id", householdId).order("component_type"),
      supabase.from("transactions").select("*").eq("household_id", householdId).gte("occurred_on", format(subMonths(new Date(), 6), "yyyy-MM-dd")).order("occurred_on", { ascending: false }),
      supabase.from("recurring_bills").select("*").eq("household_id", householdId).order("next_due_on", { nullsFirst: false }),
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
  const activeIncomeSources = (incomeSourcesResult.data ?? []).filter(
    (source) => source.status === "active",
  );
  const expectedIncomeMinor = activeIncomeSources.reduce((sum, source) => {
    if (source.tax_treatment !== "withheld" && source.tax_reserve_percent === 0) {
      return sum;
    }
    const taxReserve =
      source.tax_treatment === "withheld"
        ? 0
        : Math.round(
            source.expected_monthly_cash_minor * (source.tax_reserve_percent / 100),
          );
    return sum + source.expected_monthly_cash_minor - taxReserve;
  }, 0);
  const activeBills = (billsResult.data ?? []).filter((bill) => bill.status === "active");
  const plannedSpendingMinor = activeBills.reduce(
    (sum, bill) =>
      sum +
      monthlyEquivalent(
        bill.amount_minor,
        bill.recurrence as DashboardData["recurringBills"][number]["recurrence"],
      ),
    0,
  );

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
    expectedIncomeMinor,
    plannedSpendingMinor,
    plannedMarginMinor: expectedIncomeMinor - plannedSpendingMinor,
    incomeMinor,
    spendingMinor,
    projectedBillsMinor: (billsResult.data ?? [])
      .filter(
        (bill) =>
          bill.status === "active" &&
          bill.next_due_on !== null &&
          bill.next_due_on >= monthStart &&
          bill.next_due_on <= monthEnd,
      )
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
      institution: account.institution ?? undefined,
      purpose: account.purpose as DashboardData["accounts"][number]["purpose"],
      ownerLabel: account.owner_label ?? undefined,
      apy: account.apy,
    })),
    incomeSources: (incomeSourcesResult.data ?? []).map((source) => ({
      id: source.id,
      name: source.name,
      kind: source.kind,
      grossMonthlyMinor: source.gross_monthly_minor,
      expectedMonthlyCashMinor: source.expected_monthly_cash_minor,
      employerBenefitsMonthlyMinor: source.employer_benefits_monthly_minor,
      employeeTaxesMonthlyMinor: source.employee_taxes_monthly_minor,
      employeePretaxMonthlyMinor: source.employee_pretax_monthly_minor,
      hourlyRateMinor: source.hourly_rate_minor ?? undefined,
      expectedHoursPerWeek: source.expected_hours_per_week ?? undefined,
      variable: source.variable,
      taxTreatment: source.tax_treatment,
      taxReservePercent: source.tax_reserve_percent,
      status: source.status,
      components: (incomeComponentsResult.data ?? [])
        .filter((component) => component.income_source_id === source.id)
        .map((component) => ({
          id: component.id,
          name: component.name,
          type: component.component_type,
          monthlyAmountMinor: component.monthly_amount_minor,
        })),
    })),
    transactions: allTransactions.slice(0, 50).map((transaction) => ({
      id: transaction.id,
      accountId: transaction.account_id,
      categoryId: transaction.category_id,
      incomeSourceId: transaction.income_source_id ?? undefined,
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
      expenseType: bill.expense_type,
      billingAccountLabel: bill.billing_account_label ?? undefined,
      paymentMethod: bill.payment_method ?? undefined,
      privacyMask: bill.privacy_mask ?? undefined,
      essential: bill.essential,
      notes: bill.notes ?? undefined,
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
    setupReviewCount:
      activeBills.filter((bill) => bill.next_due_on === null).length +
      activeIncomeSources.filter(
        (source) =>
          source.tax_treatment !== "withheld" && source.tax_reserve_percent === 0,
      ).length,
    emergencyRunwayMonths: (() => {
      const emergencyBalance = (accountsResult.data ?? [])
        .filter((account) => account.purpose === "emergency")
        .reduce((sum, account) => sum + account.balance_minor, 0);
      const essentialMonthly = activeBills
        .filter((bill) => bill.essential)
        .reduce(
          (sum, bill) =>
            sum +
            monthlyEquivalent(
              bill.amount_minor,
              bill.recurrence as DashboardData["recurringBills"][number]["recurrence"],
            ),
          0,
        );
      return essentialMonthly ? emergencyBalance / essentialMonthly : 0;
    })(),
    categorySpending: [...categories.entries()].map(([name, amountMinor], index) => ({
      name,
      amountMinor,
      color: ["#e68e0d", "#ffc107", "#d35f5f", "#c63d3d", "#8a8a8d"][index % 5],
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

function spendableIncome(incomeSources: DashboardData["incomeSources"]) {
  return incomeSources
    .filter((source) => source.status === "active")
    .reduce((sum, source) => {
      if (source.taxTreatment !== "withheld" && source.taxReservePercent === 0) return sum;
      const reserve =
        source.taxTreatment === "withheld"
          ? 0
          : Math.round(source.expectedMonthlyCashMinor * (source.taxReservePercent / 100));
      return sum + source.expectedMonthlyCashMinor - reserve;
    }, 0);
}

async function getDemoDashboard(): Promise<DashboardData> {
  const privateSeed = await loadPrivateSeed();
  const baseDashboard = privateSeed ? withPrivateSeed(demoDashboard, privateSeed) : demoDashboard;
  const cookieStore = await cookies();
  const encodedOverrides = cookieStore.get("vault-x-demo-income")?.value;
  let incomeSources = baseDashboard.incomeSources;
  if (encodedOverrides) {
    try {
      const overrides = JSON.parse(encodedOverrides) as Record<
        string,
        Partial<DashboardData["incomeSources"][number]>
      >;
      const baseIds = new Set(baseDashboard.incomeSources.map((source) => source.id));
      const legacyDemoIds = new Set(demoDashboard.incomeSources.map((source) => source.id));
      incomeSources = baseDashboard.incomeSources.map((source) => ({
        ...source,
        ...(overrides[source.id] ?? {}),
        components: source.components,
      }));
      for (const [id, override] of Object.entries(overrides)) {
        if (privateSeed?.incomeSources && legacyDemoIds.has(id)) continue;
        if (!baseIds.has(id)) {
          incomeSources.push({
            id,
            name: String(override.name ?? "Income source"),
            kind: override.kind ?? "other",
            grossMonthlyMinor: override.grossMonthlyMinor ?? 0,
            expectedMonthlyCashMinor: override.expectedMonthlyCashMinor ?? 0,
            employerBenefitsMonthlyMinor: override.employerBenefitsMonthlyMinor ?? 0,
            employeeTaxesMonthlyMinor: override.employeeTaxesMonthlyMinor ?? 0,
            employeePretaxMonthlyMinor: override.employeePretaxMonthlyMinor ?? 0,
            hourlyRateMinor: override.hourlyRateMinor,
            expectedHoursPerWeek: override.expectedHoursPerWeek,
            variable: override.variable ?? false,
            taxTreatment: override.taxTreatment ?? "withheld",
            taxReservePercent: override.taxReservePercent ?? 0,
            status: "active",
            components: [],
          });
        }
      }
    } catch {
      incomeSources = baseDashboard.incomeSources;
    }
  }

  const [billState, planState] = await Promise.all([
    readDemoState<DemoBillsState>(DEMO_BILLS_COOKIE, {}),
    readDemoState<DemoPlanState>(DEMO_PLAN_COOKIE, {}),
  ]);
  const recurringBills = applyDemoBills(baseDashboard.recurringBills, billState);
  const { budgets, goals } = applyDemoPlan(baseDashboard, planState);
  const expectedIncomeMinor = spendableIncome(incomeSources);
  const plannedSpendingMinor = recurringBurden(recurringBills);
  return {
    ...baseDashboard,
    incomeSources,
    recurringBills,
    budgets,
    goals,
    expectedIncomeMinor,
    plannedSpendingMinor,
    plannedMarginMinor: expectedIncomeMinor - plannedSpendingMinor,
    setupReviewCount:
      recurringBills.filter((bill) => bill.status === "active" && bill.nextDueOn === null).length +
      incomeSources.filter(
        (source) =>
          source.status === "active" &&
          source.taxTreatment !== "withheld" &&
          source.taxReservePercent === 0,
      ).length,
  };
}

type PrivateSeed = {
  incomeSources?: Array<{
    sourceKey: string;
    name: string;
    kind: "salary" | "hourly" | "other";
    grossMonthly: number;
    expectedMonthlyCash: number;
    employerBenefitsMonthly?: number;
    employeeTaxesMonthly?: number;
    employeePretaxMonthly?: number;
    hourlyRate?: number | null;
    expectedHoursPerWeek?: number | null;
    variable?: boolean;
    taxTreatment?: "withheld" | "unwithheld" | "unknown";
    taxReservePercent?: number;
    components?: Array<{
      sourceKey: string;
      name: string;
      type: "gross_pay" | "employee_tax" | "employee_pretax_deduction" | "employer_benefit";
      monthlyAmount: number;
    }>;
  }>;
  obligations?: Array<{
    sourceKey: string;
    name: string;
    category: string;
    amount: number;
    recurrence: DashboardData["recurringBills"][number]["recurrence"];
    nextDueOn: string | null;
    expenseType: DashboardData["recurringBills"][number]["expenseType"];
    billingAccountLabel?: string | null;
    paymentMethod?: string | null;
    privacyMask?: DashboardData["recurringBills"][number]["privacyMask"] | null;
    essential?: boolean;
    autopay?: boolean;
    status?: "active" | "paused";
    notes?: string | null;
  }>;
};

async function loadPrivateSeed(): Promise<{
  incomeSources: DashboardData["incomeSources"];
  recurringBills: DashboardData["recurringBills"];
} | null> {
  if (process.env.NODE_ENV !== "development") return null;
  try {
    const raw = await readFile(join(process.cwd(), ".private", "finance-seed.json"), "utf8");
    const seed = JSON.parse(raw) as PrivateSeed;
    if (!Array.isArray(seed.incomeSources)) return null;
    return {
      incomeSources: seed.incomeSources.map((source) => ({
        id: `private-${source.sourceKey}`,
        name: source.name,
        kind: source.kind,
        grossMonthlyMinor: Math.round(source.grossMonthly * 100),
        expectedMonthlyCashMinor: Math.round(source.expectedMonthlyCash * 100),
        employerBenefitsMonthlyMinor: Math.round((source.employerBenefitsMonthly ?? 0) * 100),
        employeeTaxesMonthlyMinor: Math.round((source.employeeTaxesMonthly ?? 0) * 100),
        employeePretaxMonthlyMinor: Math.round((source.employeePretaxMonthly ?? 0) * 100),
        hourlyRateMinor:
          source.hourlyRate == null ? undefined : Math.round(source.hourlyRate * 100),
        expectedHoursPerWeek: source.expectedHoursPerWeek ?? undefined,
        variable: source.variable ?? false,
        taxTreatment: source.taxTreatment ?? "withheld",
        taxReservePercent: source.taxReservePercent ?? 0,
        status: "active",
        components: (source.components ?? []).map((component) => ({
          id: `private-${source.sourceKey}-${component.sourceKey}`,
          name: component.name,
          type: component.type,
          monthlyAmountMinor: Math.round(component.monthlyAmount * 100),
        })),
      })),
      recurringBills: (seed.obligations ?? []).map((bill) => ({
        id: `private-${bill.sourceKey}`,
        name: bill.name,
        amountMinor: Math.round(bill.amount * 100),
        currency: "USD" as const,
        recurrence: bill.recurrence,
        nextDueOn: bill.nextDueOn,
        categoryId: bill.category,
        autopay: bill.autopay ?? false,
        status: bill.status ?? "active",
        expenseType: bill.expenseType,
        billingAccountLabel: bill.billingAccountLabel ?? undefined,
        paymentMethod: bill.paymentMethod ?? undefined,
        privacyMask: bill.privacyMask ?? undefined,
        essential: bill.essential ?? false,
        notes: bill.notes ?? undefined,
      })),
    };
  } catch {
    return null;
  }
}

function withPrivateSeed(
  dashboard: DashboardData,
  seed: {
    incomeSources: DashboardData["incomeSources"];
    recurringBills: DashboardData["recurringBills"];
  },
): DashboardData {
  const expectedIncomeMinor = spendableIncome(seed.incomeSources);
  const plannedSpendingMinor = recurringBurden(seed.recurringBills);
  const primaryIncome = seed.incomeSources.find((source) => !source.variable);
  return {
    ...dashboard,
    incomeSources: seed.incomeSources,
    recurringBills: seed.recurringBills.length > 0 ? seed.recurringBills : dashboard.recurringBills,
    expectedIncomeMinor,
    plannedSpendingMinor,
    plannedMarginMinor: expectedIncomeMinor - plannedSpendingMinor,
    incomeMinor: primaryIncome?.expectedMonthlyCashMinor ?? dashboard.incomeMinor,
    transactions: dashboard.transactions.map((transaction) =>
      transaction.id === "t1" && primaryIncome
        ? {
            ...transaction,
            incomeSourceId: primaryIncome.id,
            amountMinor: primaryIncome.expectedMonthlyCashMinor,
          }
        : transaction,
    ),
    setupReviewCount:
      (seed.recurringBills.length > 0 ? seed.recurringBills : dashboard.recurringBills).filter(
        (bill) => bill.status === "active" && bill.nextDueOn === null,
      ).length +
      seed.incomeSources.filter(
        (source) =>
          source.status === "active" &&
          source.taxTreatment !== "withheld" &&
          source.taxReservePercent === 0,
      ).length,
  };
}
