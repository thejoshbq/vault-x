import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  CircleAlert,
  Landmark,
  Sparkles,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { CashFlowChart } from "@/components/charts/cash-flow-chart";
import { getDashboardData } from "@/lib/data/dashboard";
import { dueLabel } from "@/lib/finance/recurrence";
import { formatMoney, percent } from "@/lib/finance/money";

export default async function HomePage() {
  const data = await getDashboardData();
  const surplus = data.incomeMinor - data.spendingMinor;

  return (
    <div className="animate-rise space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">{data.monthLabel}</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Good afternoon.</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            Your plan is steady. Dining needs a little attention before the month closes.
          </p>
        </div>
        <Link href="/insights" className="button-secondary w-fit"><Sparkles size={16} /> Ask Vault</Link>
      </header>

      <section aria-label="Monthly summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Available balance" value={formatMoney(data.accountBalanceMinor, data.currency)} icon={Landmark} detail="Across all accounts" />
        <Metric label="Income" value={formatMoney(data.incomeMinor, data.currency)} icon={ArrowDownRight} detail="This month" tone="positive" />
        <Metric label="Spent" value={formatMoney(data.spendingMinor, data.currency)} icon={ArrowUpRight} detail={`${percent(data.spendingMinor, data.incomeMinor)}% of income`} />
        <Metric label="Monthly surplus" value={formatMoney(surplus, data.currency)} icon={WalletCards} detail="Before remaining bills" tone={surplus >= 0 ? "positive" : "attention"} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(20rem,.7fr)]">
        <section className="card p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">Cash flow</p>
              <h2 className="mt-1 text-xl font-black">Six-month rhythm</h2>
            </div>
            <div className="hidden items-center gap-4 text-xs font-bold text-[var(--muted)] sm:flex">
              <span className="flex items-center gap-2"><i className="size-2 rounded-full bg-[#285d52]" />Income</span>
              <span className="flex items-center gap-2"><i className="size-2 rounded-full bg-[#b97053]" />Spending</span>
            </div>
          </div>
          <div className="mt-5"><CashFlowChart data={data.monthlyTrend} currency={data.currency} /></div>
        </section>

        <section className="card overflow-hidden">
          <div className="border-b border-[var(--line)] p-5">
            <div className="flex items-center justify-between">
              <div><p className="eyebrow">AI briefing</p><h2 className="mt-1 text-lg font-black">What deserves attention</h2></div>
              <span className="grid size-9 place-items-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand-strong)]"><Sparkles size={17} /></span>
            </div>
          </div>
          <div className="divide-y divide-[var(--line)]">
            {data.insights.slice(0, 2).map((insight) => (
              <article key={insight.id} className="p-5">
                <div className="flex gap-3">
                  <CircleAlert size={17} className={insight.severity === "attention" ? "mt-0.5 shrink-0 text-[var(--amber)]" : "mt-0.5 shrink-0 text-[var(--brand)]"} />
                  <div>
                    <h3 className="text-sm font-black">{insight.title}</h3>
                    <p className="mt-1.5 text-xs leading-5 text-[var(--muted)]">{insight.body}</p>
                    {insight.actionHref && <Link href={insight.actionHref} className="mt-3 inline-flex items-center gap-1 text-xs font-black text-[var(--brand-strong)]">{insight.actionLabel}<ArrowRight size={13} /></Link>}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div><p className="eyebrow">Budgets</p><h2 className="mt-1 text-lg font-black">This month</h2></div>
            <Link href="/plan" className="button-quiet">View plan <ArrowRight size={15} /></Link>
          </div>
          <div className="mt-5 space-y-5">
            {data.budgets.map((budget) => {
              const used = percent(budget.spentMinor, budget.limitMinor);
              return (
                <div key={budget.id}>
                  <div className="mb-2 flex items-end justify-between gap-4">
                    <div><p className="text-sm font-black">{budget.name}</p><p className="mt-0.5 text-xs text-[var(--muted)]">{formatMoney(budget.spentMinor, data.currency)} spent</p></div>
                    <p className={`text-sm font-black ${used >= 90 ? "text-[var(--amber)]" : ""}`}>{used}%</p>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[var(--background)]"><div className={`h-full rounded-full ${used >= 90 ? "bg-[var(--amber)]" : "bg-[var(--brand)]"}`} style={{ width: `${Math.min(used, 100)}%` }} /></div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--line)] p-5 sm:px-6">
            <div><p className="eyebrow">Coming up</p><h2 className="mt-1 text-lg font-black">Bills and subscriptions</h2></div>
            <CalendarClock size={20} className="text-[var(--brand)]" />
          </div>
          <div className="divide-y divide-[var(--line)]">
            {data.recurringBills.slice(0, 4).map((bill) => (
              <div key={bill.id} className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
                <div><p className="text-sm font-black">{bill.name}</p><p className="mt-1 text-xs text-[var(--muted)]">{dueLabel(bill.nextDueOn)} · {bill.autopay ? "Autopay" : "Manual"}</p></div>
                <p className="text-sm font-black">{formatMoney(bill.amountMinor, bill.currency)}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--line)] p-5 sm:px-6">
          <div><p className="eyebrow">Activity</p><h2 className="mt-1 text-lg font-black">Recent transactions</h2></div>
          <Link href="/transactions" className="button-quiet">See all <ArrowRight size={15} /></Link>
        </div>
        <div className="divide-y divide-[var(--line)]">
          {data.transactions.slice(0, 5).map((transaction) => (
            <div key={transaction.id} className="grid grid-cols-[1fr_auto] items-center gap-4 px-5 py-4 sm:grid-cols-[1fr_9rem_8rem] sm:px-6">
              <div><p className="text-sm font-black">{transaction.merchant}</p><p className="mt-1 text-xs text-[var(--muted)]">{transaction.occurredOn}{transaction.receiptId ? " · Receipt attached" : ""}</p></div>
              <p className="hidden text-right text-xs font-bold text-[var(--muted)] sm:block">{transaction.kind}</p>
              <p className={`text-right text-sm font-black ${transaction.kind === "income" ? "text-[var(--brand-strong)]" : ""}`}>{transaction.kind === "income" ? "+" : "−"}{formatMoney(transaction.amountMinor, transaction.currency)}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value, detail, icon: Icon, tone = "default" }: { label: string; value: string; detail: string; icon: typeof Landmark; tone?: "default" | "positive" | "attention" }) {
  return (
    <article className="card p-5">
      <div className="flex items-center justify-between"><p className="eyebrow">{label}</p><span className={`grid size-8 place-items-center rounded-lg ${tone === "attention" ? "bg-[var(--amber-soft)] text-[var(--amber)]" : "bg-[var(--brand-soft)] text-[var(--brand-strong)]"}`}><Icon size={15} /></span></div>
      <p className="metric-number mt-5 text-3xl font-bold">{value}</p>
      <p className="mt-2 text-xs text-[var(--muted)]">{detail}</p>
    </article>
  );
}
