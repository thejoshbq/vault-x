import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarClock,
  CircleAlert,
  Landmark,
  PiggyBank,
  ReceiptText,
  Sparkles,
  Target,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { CashFlowChart } from "@/components/charts/cash-flow-chart";
import { getDashboardData } from "@/lib/data/dashboard";
import { formatMoney, percent } from "@/lib/finance/money";
import { dueLabel, monthlyEquivalent } from "@/lib/finance/recurrence";

export default async function HomePage() {
  const data = await getDashboardData();
  const grossIncome = data.incomeSources
    .filter((source) => source.status === "active")
    .reduce((sum, source) => sum + source.grossMonthlyMinor, 0);
  const employerBenefits = data.incomeSources
    .filter((source) => source.status === "active")
    .reduce((sum, source) => sum + source.employerBenefitsMonthlyMinor, 0);
  const employeeTaxes = data.incomeSources
    .filter((source) => source.status === "active")
    .reduce((sum, source) => sum + source.employeeTaxesMonthlyMinor, 0);
  const employeePretax = data.incomeSources
    .filter((source) => source.status === "active")
    .reduce((sum, source) => sum + source.employeePretaxMonthlyMinor, 0);
  const taxReserve = data.incomeSources
    .filter(
      (source) =>
        source.status === "active" &&
        source.taxTreatment !== "withheld" &&
        source.taxReservePercent > 0,
    )
    .reduce(
      (sum, source) =>
        sum +
        Math.round(source.expectedMonthlyCashMinor * (source.taxReservePercent / 100)),
      0,
    );
  const incomeAwaitingTaxSetup = data.incomeSources
    .filter(
      (source) =>
        source.status === "active" &&
        source.taxTreatment !== "withheld" &&
        source.taxReservePercent === 0,
    )
    .reduce((sum, source) => sum + source.expectedMonthlyCashMinor, 0);
  const irregularBills = data.recurringBills.filter(
    (bill) =>
      bill.status === "active" &&
      ["quarterly", "semiannual", "yearly"].includes(bill.recurrence),
  );
  const sinkingFundMinor = irregularBills.reduce(
    (sum, bill) => sum + monthlyEquivalent(bill.amountMinor, bill.recurrence),
    0,
  );
  const emergencyBalance = data.accounts
    .filter((account) => account.purpose === "emergency")
    .reduce((sum, account) => sum + account.balanceMinor, 0);
  const projectedAnnualInterestMinor = data.accounts.reduce(
    (sum, account) =>
      sum + Math.round(Math.max(account.balanceMinor, 0) * (account.apy / 100)),
    0,
  );
  const actualMargin = data.incomeMinor - data.spendingMinor;
  const hasMissingBillDates = data.recurringBills.some(
    (bill) => bill.status === "active" && !bill.nextDueOn,
  );

  return (
    <div className="animate-rise space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">{data.monthLabel} plan</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
            What this month needs to do.
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            Expected income funds the plan. Actual deposits and spending show whether reality
            is matching it.
          </p>
        </div>
        <Link href="/insights" className="button-secondary w-fit">
          <Sparkles size={16} /> Ask Vault
        </Link>
      </header>

      {data.setupReviewCount > 0 && (
        <Link
          href={hasMissingBillDates ? "/bills" : "/income"}
          className="flex items-center justify-between gap-4 rounded-2xl bg-[var(--amber-soft)] p-4"
        >
          <span className="flex items-center gap-3">
            <CircleAlert className="shrink-0 text-[var(--amber)]" size={20} />
            <span>
              <span className="block text-sm font-black">
                {data.setupReviewCount} planning item{data.setupReviewCount === 1 ? "" : "s"} need review
              </span>
              <span className="mt-0.5 block text-xs text-[var(--muted)]">
                Complete missing renewal dates or tax reserves before trusting the forecast.
              </span>
            </span>
          </span>
          <ArrowRight className="shrink-0 text-[var(--amber)]" size={17} />
        </Link>
      )}

      <section aria-label="Monthly plan summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Expected spendable income"
          value={formatMoney(data.expectedIncomeMinor, data.currency)}
          icon={BriefcaseBusiness}
          detail="After known payroll deductions"
          primary
        />
        <Metric
          label="Planned monthly outflow"
          value={formatMoney(data.plannedSpendingMinor, data.currency)}
          icon={ReceiptText}
          detail="All cadences normalized"
        />
        <Metric
          label="Planned margin"
          value={formatMoney(data.plannedMarginMinor, data.currency)}
          icon={WalletCards}
          detail={`${percent(data.plannedSpendingMinor, data.expectedIncomeMinor)}% committed`}
          tone={data.plannedMarginMinor >= 0 ? "positive" : "attention"}
        />
        <Metric
          label="Actual margin so far"
          value={formatMoney(actualMargin, data.currency)}
          icon={Target}
          detail={`${formatMoney(data.incomeMinor, data.currency)} received · ${formatMoney(data.spendingMinor, data.currency)} spent`}
          tone={actualMargin >= 0 ? "positive" : "attention"}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
        <section className="card p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">Plan versus actual</p>
              <h2 className="mt-1 text-xl font-black">Monthly reconciliation</h2>
            </div>
            <Link href="/transactions" className="button-quiet">
              Reconcile ledger <ArrowRight size={15} />
            </Link>
          </div>
          <div className="mt-6 space-y-6">
            <ReconciliationBar
              label="Income received"
              actual={data.incomeMinor}
              planned={data.expectedIncomeMinor}
              currency={data.currency}
            />
            <ReconciliationBar
              label="Spending recorded"
              actual={data.spendingMinor}
              planned={data.plannedSpendingMinor}
              currency={data.currency}
            />
          </div>
          <div className="mt-7 border-t border-[var(--line)] pt-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-black">Unallocated planned cash</p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Available for savings, debt, or a plan adjustment
                </p>
              </div>
              <p className="metric-number text-3xl font-bold">
                {formatMoney(data.plannedMarginMinor, data.currency)}
              </p>
            </div>
          </div>
        </section>

        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--line)] p-5 sm:px-6">
            <div>
              <p className="eyebrow">Paycheck path</p>
              <h2 className="mt-1 text-xl font-black">Compensation is not cash</h2>
            </div>
            <BriefcaseBusiness className="text-[var(--brand)]" size={20} />
          </div>
          <div className="space-y-4 p-5 sm:p-6">
            <FlowRow label="Gross cash pay" value={grossIncome} currency={data.currency} />
            <FlowRow
              label="Employee taxes"
              value={-employeeTaxes}
              currency={data.currency}
            />
            <FlowRow
              label="Pre-tax deductions"
              value={-employeePretax}
              currency={data.currency}
            />
            {taxReserve > 0 && (
              <FlowRow label="Tax reserve" value={-taxReserve} currency={data.currency} />
            )}
            {incomeAwaitingTaxSetup > 0 && (
              <FlowRow
                label="Income awaiting tax setup"
                value={-incomeAwaitingTaxSetup}
                currency={data.currency}
              />
            )}
            <div className="border-t border-[var(--line)] pt-4">
              <FlowRow
                label="Expected spendable cash"
                value={data.expectedIncomeMinor}
                currency={data.currency}
                strong
              />
            </div>
            <div className="rounded-xl bg-[var(--brand-soft)] p-3">
              <div className="flex justify-between gap-4 text-xs">
                <span className="text-[var(--muted)]">Employer-paid benefits tracked separately</span>
                <strong>{formatMoney(employerBenefits, data.currency)}</strong>
              </div>
              <div className="mt-2 flex justify-between gap-4 text-xs">
                <span className="text-[var(--muted)]">Total compensation value</span>
                <strong>{formatMoney(grossIncome + employerBenefits, data.currency)}</strong>
              </div>
            </div>
            <Link href="/income" className="button-secondary w-full">
              Open income breakdown <ArrowRight size={15} />
            </Link>
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">Irregular costs</p>
              <h2 className="mt-1 text-lg font-black">Monthly sinking fund</h2>
            </div>
            <CalendarClock className="text-[var(--brand)]" size={20} />
          </div>
          <p className="metric-number mt-5 text-4xl font-bold">
            {formatMoney(sinkingFundMinor, data.currency)}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Reserve each month for quarterly, twice-yearly, and annual charges.
          </p>
          <div className="mt-5 divide-y divide-[var(--line)]">
            {irregularBills.map((bill) => (
              <div key={bill.id} className="flex justify-between gap-4 py-3 text-sm">
                <div>
                  <p className="font-black">{bill.name}</p>
                  <p className="mt-1 text-xs capitalize text-[var(--muted)]">
                    {bill.recurrence} · {dueLabel(bill.nextDueOn)}
                  </p>
                </div>
                <strong>{formatMoney(monthlyEquivalent(bill.amountMinor, bill.recurrence), bill.currency)}/mo</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="card p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">Safety margin</p>
              <h2 className="mt-1 text-lg font-black">Emergency runway</h2>
            </div>
            <PiggyBank className="text-[var(--brand)]" size={20} />
          </div>
          <p className="metric-number mt-5 text-4xl font-bold">
            {data.emergencyRunwayMonths.toFixed(1)} months
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {formatMoney(emergencyBalance, data.currency)} reserved against essential monthly obligations.
          </p>
          <p className="mt-2 text-xs font-bold text-[var(--brand-strong)]">
            {formatMoney(projectedAnnualInterestMinor, data.currency)} estimated annual interest at current balances and APYs
          </p>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-[var(--background)]">
            <div
              className="h-full rounded-full bg-[var(--brand)]"
              style={{ width: `${Math.min((data.emergencyRunwayMonths / 6) * 100, 100)}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-[0.68rem] font-bold text-[var(--muted)]">
            <span>0 months</span>
            <span>6-month target</span>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {data.accounts
              .filter((account) => ["emergency", "dependent_savings", "income_holding"].includes(account.purpose))
              .slice(0, 4)
              .map((account) => (
                <div key={account.id} className="rounded-xl bg-[var(--background)] p-3">
                  <p className="truncate text-xs font-bold">{account.name}</p>
                  <p className="mt-2 text-sm font-black">{formatMoney(account.balanceMinor, account.currency)}</p>
                  <p className="mt-1 text-[0.68rem] text-[var(--muted)]">{account.apy}% APY</p>
                </div>
              ))}
          </div>
        </section>
      </div>

      <section className="card p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="eyebrow">Actual cash flow</p>
            <h2 className="mt-1 text-xl font-black">Six-month ledger trend</h2>
          </div>
          <Landmark className="text-[var(--brand)]" size={20} />
        </div>
        <div className="mt-5">
          <CashFlowChart data={data.monthlyTrend} currency={data.currency} />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--line)] p-5 sm:px-6">
            <div>
              <p className="eyebrow">Coming up</p>
              <h2 className="mt-1 text-lg font-black">Known due dates</h2>
            </div>
            <Link href="/bills" className="button-quiet">
              All obligations <ArrowRight size={15} />
            </Link>
          </div>
          <div className="divide-y divide-[var(--line)]">
            {data.recurringBills
              .filter((bill) => bill.nextDueOn)
              .slice(0, 4)
              .map((bill) => (
                <div key={bill.id} className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
                  <div>
                    <p className="text-sm font-black">{bill.name}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {dueLabel(bill.nextDueOn)} · {bill.billingAccountLabel ?? "Account not assigned"}
                    </p>
                  </div>
                  <p className="text-sm font-black">{formatMoney(bill.amountMinor, bill.currency)}</p>
                </div>
              ))}
          </div>
        </section>

        <section className="card overflow-hidden">
          <div className="border-b border-[var(--line)] p-5 sm:px-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="eyebrow">AI briefing</p>
                <h2 className="mt-1 text-lg font-black">What deserves attention</h2>
              </div>
              <Sparkles className="text-[var(--brand)]" size={19} />
            </div>
          </div>
          <div className="divide-y divide-[var(--line)]">
            {data.insights.slice(0, 2).map((insight) => (
              <article key={insight.id} className="p-5">
                <h3 className="text-sm font-black">{insight.title}</h3>
                <p className="mt-1.5 text-xs leading-5 text-[var(--muted)]">{insight.body}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  detail,
  icon: Icon,
  tone = "default",
  primary = false,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Landmark;
  tone?: "default" | "positive" | "attention";
  primary?: boolean;
}) {
  return (
    <article className={`card p-5 ${primary ? "card-accent" : ""}`}>
      <div className="flex items-center justify-between">
        <p className="eyebrow">{label}</p>
        <span
          className={`grid size-8 place-items-center rounded-lg ${
            primary
              ? "bg-[var(--brand)]/15 text-[var(--brand-strong)]"
              : tone === "attention"
                ? "bg-[var(--amber-soft)] text-[var(--amber)]"
                : "bg-[var(--brand-soft)] text-[var(--brand-strong)]"
          }`}
        >
          <Icon size={15} />
        </span>
      </div>
      <p className="metric-number mt-5 text-3xl font-bold">{value}</p>
      <p className={`mt-2 text-xs ${primary ? "metric-detail" : "text-[var(--muted)]"}`}>{detail}</p>
    </article>
  );
}

function ReconciliationBar({
  label,
  actual,
  planned,
  currency,
}: {
  label: string;
  actual: number;
  planned: number;
  currency: "USD" | "EUR" | "GBP" | "CAD" | "AUD";
}) {
  const progress = percent(actual, planned);
  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-black">{label}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {formatMoney(actual, currency)} actual of {formatMoney(planned, currency)} planned
          </p>
        </div>
        <strong>{progress}%</strong>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--background)]">
        <div
          className={`h-full rounded-full ${progress > 100 && label.includes("Spending") ? "bg-[var(--amber)]" : "bg-[var(--brand)]"}`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
    </div>
  );
}

function FlowRow({
  label,
  value,
  currency,
  strong = false,
}: {
  label: string;
  value: number;
  currency: "USD" | "EUR" | "GBP" | "CAD" | "AUD";
  strong?: boolean;
}) {
  return (
    <div className={`flex justify-between gap-4 text-sm ${strong ? "font-black" : ""}`}>
      <span className={strong ? "" : "text-[var(--muted)]"}>{label}</span>
      <span>{formatMoney(value, currency, value < 0 ? { signDisplay: "always" } : {})}</span>
    </div>
  );
}
