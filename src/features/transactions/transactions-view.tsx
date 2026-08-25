"use client";

import { Camera, Download, Filter, Paperclip, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { DashboardData } from "@/lib/domain";
import { formatMoney, percent } from "@/lib/finance/money";
import { TransactionForm } from "./transaction-form";

export function TransactionsView({
  data,
  categories,
  startNew = false,
  onScanReceipt,
}: {
  data: DashboardData;
  categories: Array<{ id: string; name: string }>;
  startNew?: boolean;
  onScanReceipt?: () => void;
}) {
  const [formOpen, setFormOpen] = useState(startNew);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("all");
  const filtered = useMemo(
    () =>
      data.transactions.filter(
        (transaction) =>
          (kind === "all" || transaction.kind === kind) &&
          transaction.merchant.toLowerCase().includes(query.toLowerCase()),
      ),
    [data.transactions, kind, query],
  );

  return (
    <div className="animate-rise space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="eyebrow">Your ledger</p><h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Transactions</h1><p className="mt-2 text-sm text-[var(--muted)]">Search every movement, add it manually, or let a receipt do the typing.</p></div>
        <div className="flex flex-wrap gap-2"><a href="/api/transactions/export" className="button-secondary"><Download size={16} /> Export CSV</a><button className="button-secondary" onClick={onScanReceipt}><Camera size={16} /> Scan receipt</button><button className="button-primary" onClick={() => setFormOpen(true)}><Plus size={16} /> Add transaction</button></div>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <LedgerMetric
          label="Income received"
          value={formatMoney(data.incomeMinor, data.currency)}
          detail={`${percent(data.incomeMinor, data.expectedIncomeMinor)}% of ${formatMoney(data.expectedIncomeMinor, data.currency)} expected`}
        />
        <LedgerMetric
          label="Spending recorded"
          value={formatMoney(data.spendingMinor, data.currency)}
          detail={`${percent(data.spendingMinor, data.plannedSpendingMinor)}% of ${formatMoney(data.plannedSpendingMinor, data.currency)} planned`}
        />
        <LedgerMetric
          label="Actual margin"
          value={formatMoney(data.incomeMinor - data.spendingMinor, data.currency)}
          detail={`Planned margin ${formatMoney(data.plannedMarginMinor, data.currency)}`}
        />
      </section>

      <section className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[var(--line)] p-4 sm:flex-row sm:items-center">
          <label className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={17} /><span className="sr-only">Search transactions</span><input className="input pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search merchant or source…" /></label>
          <label className="relative sm:w-44"><Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={16} /><span className="sr-only">Filter transaction type</span><select className="input pl-10" value={kind} onChange={(event) => setKind(event.target.value)}><option value="all">All types</option><option value="expense">Expenses</option><option value="income">Income</option><option value="transfer">Transfers</option></select></label>
        </div>
        <div className="hidden grid-cols-[minmax(0,1fr)_9rem_9rem_8rem] gap-4 border-b border-[var(--line)] px-6 py-3 text-xs font-black uppercase tracking-wider text-[var(--muted)] md:grid"><span>Merchant</span><span>Date</span><span>Account</span><span className="text-right">Amount</span></div>
        <div className="divide-y divide-[var(--line)]">
          {filtered.map((transaction) => {
            const account = data.accounts.find((item) => item.id === transaction.accountId);
            return <article key={transaction.id} className="grid grid-cols-[1fr_auto] gap-4 px-5 py-4 md:grid-cols-[minmax(0,1fr)_9rem_9rem_8rem] md:items-center md:px-6"><div className="min-w-0"><div className="flex items-center gap-2"><h2 className="truncate text-sm font-black">{transaction.merchant}</h2>{transaction.receiptId && <Paperclip size={13} className="shrink-0 text-[var(--brand)]" />}</div><p className="mt-1 truncate text-xs capitalize text-[var(--muted)]">{transaction.kind}{transaction.note ? ` · ${transaction.note}` : ""}</p></div><p className="hidden text-sm text-[var(--muted)] md:block">{transaction.occurredOn}</p><p className="hidden truncate text-sm text-[var(--muted)] md:block">{account?.name ?? "Account"}</p><p className={`text-right text-sm font-black ${transaction.kind === "income" ? "text-[var(--brand-strong)]" : ""}`}>{transaction.kind === "income" ? "+" : "−"}{formatMoney(transaction.amountMinor, transaction.currency)}</p></article>;
          })}
          {filtered.length === 0 && <div className="p-12 text-center"><p className="font-black">No matching transactions</p><p className="mt-1 text-sm text-[var(--muted)]">Try a different search or filter.</p></div>}
        </div>
      </section>
      <TransactionForm
        accounts={data.accounts}
        categories={categories}
        incomeSources={data.incomeSources}
        open={formOpen}
        onClose={() => setFormOpen(false)}
      />
    </div>
  );
}

function LedgerMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="card p-5">
      <p className="eyebrow">{label}</p>
      <p className="metric-number mt-3 text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-[var(--muted)]">{detail}</p>
    </article>
  );
}
