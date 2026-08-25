import {
  ArrowDown,
  BriefcaseBusiness,
  CircleAlert,
  HeartHandshake,
  ReceiptText,
  ShieldCheck,
} from "lucide-react";
import type { DashboardData } from "@/lib/domain";
import { IncomeSourceEditor } from "@/features/income/income-source-editor";
import { getDashboardData } from "@/lib/data/dashboard";
import { formatMoney, percent } from "@/lib/finance/money";

export const metadata = { title: "Income" };

export default async function IncomePage() {
  const data = await getDashboardData();
  const currentMonth = new Date().toISOString().slice(0, 7);
  const activeSources = data.incomeSources.filter((source) => source.status === "active");
  const totals = activeSources.reduce(
    (summary, source) => ({
      gross: summary.gross + source.grossMonthlyMinor,
      cash: summary.cash + source.expectedMonthlyCashMinor,
      benefits: summary.benefits + source.employerBenefitsMonthlyMinor,
      taxes: summary.taxes + source.employeeTaxesMonthlyMinor,
      pretax: summary.pretax + source.employeePretaxMonthlyMinor,
    }),
    { gross: 0, cash: 0, benefits: 0, taxes: 0, pretax: 0 },
  );

  return (
    <div className="animate-rise space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">From compensation to usable cash</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
            Income
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            Keep employer-paid benefits visible without mistaking them for money available to
            fund the monthly plan.
          </p>
        </div>
        <IncomeSourceEditor />
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Spendable each month"
          value={formatMoney(data.expectedIncomeMinor, data.currency)}
          detail={`${percent(data.expectedIncomeMinor, totals.gross)}% of gross cash pay after reserves`}
          icon={ArrowDown}
          primary
        />
        <Metric
          label="Gross cash pay"
          value={formatMoney(totals.gross, data.currency)}
          detail="Before employee deductions"
          icon={BriefcaseBusiness}
        />
        <Metric
          label="Employee taxes + pre-tax"
          value={formatMoney(totals.taxes + totals.pretax, data.currency)}
          detail={`${formatMoney(totals.taxes, data.currency)} taxes · ${formatMoney(totals.pretax, data.currency)} pre-tax`}
          icon={ReceiptText}
        />
        <Metric
          label="Total compensation"
          value={formatMoney(totals.gross + totals.benefits, data.currency)}
          detail={`${formatMoney(totals.benefits, data.currency)} employer-paid, non-cash`}
          icon={HeartHandshake}
        />
      </section>

      <div className="space-y-5">
        {activeSources.map((source) => {
          const weeklyEstimate =
            source.hourlyRateMinor && source.expectedHoursPerWeek
              ? source.hourlyRateMinor * source.expectedHoursPerWeek
              : null;
          const needsTaxReview =
            source.taxTreatment !== "withheld" && source.taxReservePercent === 0;
          const sourceAvailable =
            needsTaxReview
              ? 0
              : source.expectedMonthlyCashMinor -
                (source.taxTreatment === "withheld"
                  ? 0
                  : Math.round(
                      source.expectedMonthlyCashMinor * (source.taxReservePercent / 100),
                    ));
          const actualReceived = data.transactions
            .filter(
              (transaction) =>
                transaction.kind === "income" &&
                transaction.incomeSourceId === source.id &&
                transaction.occurredOn.startsWith(currentMonth),
            )
            .reduce((sum, transaction) => sum + transaction.amountMinor, 0);
          return (
            <section key={source.id} className="card overflow-hidden">
              <div className="flex flex-col justify-between gap-4 border-b border-[var(--line)] p-5 sm:flex-row sm:items-start sm:p-6">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-black">{source.name}</h2>
                    <span className="rounded-lg bg-[var(--brand-soft)] px-2 py-1 text-[0.68rem] font-black uppercase tracking-wider text-[var(--brand-strong)]">
                      {source.variable ? "Variable" : "Steady"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm capitalize text-[var(--muted)]">
                    {source.kind}
                    {weeklyEstimate
                      ? ` · ${formatMoney(source.hourlyRateMinor!, data.currency)}/hour · ${source.expectedHoursPerWeek} hours/week`
                      : ""}
                  </p>
                  <div className="mt-2">
                    <IncomeSourceEditor source={source} />
                  </div>
                </div>
                <div className="sm:text-right">
                  <p className="eyebrow">Expected usable cash</p>
                  <p className="metric-number mt-1 text-3xl font-bold">
                    {formatMoney(sourceAvailable, data.currency)}
                  </p>
                  {weeklyEstimate && (
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {formatMoney(weeklyEstimate, data.currency)} expected weekly
                    </p>
                  )}
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {formatMoney(actualReceived, data.currency)} received in the current ledger window
                  </p>
                </div>
              </div>

              {needsTaxReview && (
                <div className="flex gap-3 bg-[var(--amber-soft)] px-5 py-4 sm:px-6">
                  <CircleAlert className="mt-0.5 shrink-0 text-[var(--amber)]" size={18} />
                  <div>
                    <p className="text-sm font-black">Tax reserve is not configured</p>
                    <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                      This variable income has no tax reserve. Vault X excludes it from the safe
                      monthly plan until a reserve percentage is configured.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid gap-px bg-[var(--line)] sm:grid-cols-4">
                <IncomeCell label="Gross pay" value={source.grossMonthlyMinor} currency={data.currency} />
                <IncomeCell label="Employee taxes" value={source.employeeTaxesMonthlyMinor} currency={data.currency} />
                <IncomeCell label="Pre-tax deductions" value={source.employeePretaxMonthlyMinor} currency={data.currency} />
                <IncomeCell label="Employer benefits (non-cash)" value={source.employerBenefitsMonthlyMinor} currency={data.currency} />
              </div>

              {source.components.length > 0 && (
                <div className="grid gap-6 p-5 sm:grid-cols-3 sm:p-6">
                  <ComponentGroup
                    title="Employee taxes"
                    components={source.components.filter((item) => item.type === "employee_tax")}
                    currency={data.currency}
                  />
                  <ComponentGroup
                    title="Pre-tax deductions"
                    components={source.components.filter(
                      (item) => item.type === "employee_pretax_deduction",
                    )}
                    currency={data.currency}
                  />
                  <ComponentGroup
                    title="Employer-paid benefits (non-cash)"
                    components={source.components.filter(
                      (item) => item.type === "employer_benefit",
                    )}
                    currency={data.currency}
                  />
                </div>
              )}
            </section>
          );
        })}
      </div>

      <p className="flex items-center gap-2 text-xs text-[var(--muted)]">
        <ShieldCheck size={14} />
        Expected income is planning data. Actual deposits remain in the transaction ledger.
      </p>
    </div>
  );
}

function Metric({
  label,
  value,
  detail,
  icon: Icon,
  primary = false,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof ArrowDown;
  primary?: boolean;
}) {
  return (
    <article className={`card p-5 ${primary ? "card-accent" : ""}`}>
      <div className="flex items-center justify-between">
        <p className="eyebrow">{label}</p>
        <Icon size={17} />
      </div>
      <p className="metric-number mt-5 text-3xl font-bold">{value}</p>
      <p className={`mt-2 text-xs ${primary ? "metric-detail" : "text-[var(--muted)]"}`}>{detail}</p>
    </article>
  );
}

function IncomeCell({
  label,
  value,
  currency,
}: {
  label: string;
  value: number;
  currency: DashboardData["currency"];
}) {
  return (
    <div className="bg-[var(--surface)] p-4 sm:p-5">
      <p className="text-xs font-bold text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-lg font-black">{formatMoney(value, currency)}</p>
      <p className="mt-1 text-[0.68rem] text-[var(--muted)]">per month</p>
    </div>
  );
}

function ComponentGroup({
  title,
  components,
  currency,
}: {
  title: string;
  components: DashboardData["incomeSources"][number]["components"];
  currency: DashboardData["currency"];
}) {
  if (components.length === 0) return null;
  return (
    <div>
      <h3 className="eyebrow">{title}</h3>
      <div className="mt-3 space-y-2">
        {components.map((component) => (
          <div key={component.id} className="flex justify-between gap-4 text-xs">
            <span className="text-[var(--muted)]">{component.name}</span>
            <strong>{formatMoney(component.monthlyAmountMinor, currency)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
