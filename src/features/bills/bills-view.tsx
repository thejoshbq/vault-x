"use client";

import { CalendarCheck, Check, LoaderCircle, Pause, Play, Plus, X } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import type { DashboardData } from "@/lib/domain";
import { dueLabel, monthlyEquivalent, recurringBurden } from "@/lib/finance/recurrence";
import { formatMoney } from "@/lib/finance/money";
import type { MutationState } from "@/features/transactions/actions";
import { createBill, markBillPaid, toggleBillStatus } from "./actions";

const initialState: MutationState = {};

export function BillsView({ data, startOpen = false }: { data: DashboardData; startOpen?: boolean }) {
  const [open, setOpen] = useState(startOpen);
  const [state, action, pending] = useActionState(createBill, initialState);
  useEffect(() => {
    if (state.status === "success") toast.success(state.message);
    if (state.status === "error") toast.error(state.message);
  }, [state]);
  const burden = recurringBurden(data.recurringBills);

  return (
    <div className="animate-rise space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="eyebrow">Recurring commitments</p><h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Bills</h1><p className="mt-2 text-sm text-[var(--muted)]">Know what is due, what is automatic, and what it costs each month.</p></div>
        <button className="button-primary w-fit" onClick={() => setOpen(true)}><Plus size={17} /> Add bill</button>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <Summary label="Monthly recurring" value={formatMoney(burden, data.currency)} />
        <Summary label="Due this month" value={formatMoney(data.projectedBillsMinor, data.currency)} />
        <Summary label="Active bills" value={String(data.recurringBills.filter((bill) => bill.status === "active").length)} />
      </section>

      <section className="card overflow-hidden">
        <div className="hidden grid-cols-[1fr_8rem_8rem_8rem_7rem] gap-4 border-b border-[var(--line)] px-6 py-3 text-xs font-black uppercase tracking-wider text-[var(--muted)] md:grid">
          <span>Bill</span><span>Cadence</span><span>Next due</span><span className="text-right">Amount</span><span />
        </div>
        <div className="divide-y divide-[var(--line)]">
          {data.recurringBills.map((bill) => (
            <article key={bill.id} className="grid gap-3 px-5 py-5 md:grid-cols-[1fr_8rem_8rem_8rem_7rem] md:items-center md:gap-4 md:px-6">
              <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand-strong)]"><CalendarCheck size={18} /></span><div><h2 className="text-sm font-black">{bill.name}</h2><p className="mt-1 text-xs text-[var(--muted)]">{bill.autopay ? "Autopay enabled" : "Manual payment"} · {bill.status}</p></div></div>
              <p className="text-sm capitalize text-[var(--muted)]">{bill.recurrence}</p>
              <p className="text-sm font-bold">{dueLabel(bill.nextDueOn)}</p>
              <div className="md:text-right"><p className="text-sm font-black">{formatMoney(bill.amountMinor, bill.currency)}</p><p className="text-xs text-[var(--muted)]">{formatMoney(monthlyEquivalent(bill.amountMinor, bill.recurrence), bill.currency)}/mo</p></div>
              <div className="flex justify-end gap-1">
                <button title={bill.status === "active" ? "Pause" : "Resume"} className="focus-ring grid size-9 place-items-center rounded-lg text-[var(--muted)] hover:bg-[var(--background)]" onClick={() => toggleBillStatus(bill.id, bill.status === "active" ? "paused" : "active")}>{bill.status === "active" ? <Pause size={15} /> : <Play size={15} />}</button>
                <button title="Mark paid" className="focus-ring grid size-9 place-items-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand-strong)]" onClick={() => markBillPaid(bill.id, bill.nextDueOn, bill.recurrence)}><Check size={16} /></button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/35 backdrop-blur-sm sm:place-items-center sm:p-5" onClick={() => setOpen(false)}>
          <section role="dialog" aria-modal="true" className="w-full rounded-t-3xl bg-[var(--surface)] p-5 sm:max-w-lg sm:rounded-3xl sm:p-7" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between"><div><p className="eyebrow">New commitment</p><h2 className="mt-1 text-2xl font-black">Add recurring bill</h2></div><button aria-label="Close" className="grid size-10 place-items-center" onClick={() => setOpen(false)}><X size={19} /></button></div>
            <form action={action} className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2"><span className="mb-1.5 block text-sm font-bold">Name</span><input className="input" name="name" required placeholder="Internet, rent, subscription…" /></label>
              <label className="block"><span className="mb-1.5 block text-sm font-bold">Amount</span><input className="input" name="amount" type="number" min="0.01" step="0.01" required placeholder="0.00" /></label>
              <label className="block"><span className="mb-1.5 block text-sm font-bold">Cadence</span><select className="input" name="recurrence" defaultValue="monthly"><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option></select></label>
              <label className="block sm:col-span-2"><span className="mb-1.5 block text-sm font-bold">Next due</span><input className="input" name="nextDueOn" type="date" required /></label>
              <label className="flex items-center gap-3 rounded-xl border border-[var(--line)] p-3 sm:col-span-2"><input name="autopay" type="checkbox" className="size-4 accent-[var(--brand)]" /><span><span className="block text-sm font-bold">Autopay is enabled</span><span className="block text-xs text-[var(--muted)]">Vault X will still show the due date.</span></span></label>
              <div className="mt-2 flex justify-end gap-2 sm:col-span-2"><button type="button" className="button-secondary" onClick={() => setOpen(false)}>Cancel</button><button className="button-primary" disabled={pending}>{pending ? <LoaderCircle className="animate-spin" size={17} /> : <Plus size={17} />} Add bill</button></div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <article className="card p-5"><p className="eyebrow">{label}</p><p className="metric-number mt-4 text-3xl font-bold">{value}</p></article>;
}
