"use client";

import {
  CalendarCheck,
  Check,
  CircleAlert,
  CreditCard,
  LoaderCircle,
  Pause,
  Play,
  Plus,
  X,
} from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import type { DashboardData } from "@/lib/domain";
import { dueLabel, monthlyEquivalent, recurringBurden } from "@/lib/finance/recurrence";
import { formatMoney } from "@/lib/finance/money";
import type { MutationState } from "@/features/transactions/actions";
import {
  createBill,
  markBillPaid,
  setBillDueDate,
  toggleBillStatus,
} from "./actions";

const initialState: MutationState = {};

export function BillsView({
  data,
  startOpen = false,
}: {
  data: DashboardData;
  startOpen?: boolean;
}) {
  const [open, setOpen] = useState(startOpen);
  const [showReviewOnly, setShowReviewOnly] = useState(false);
  const [state, action, pending] = useActionState(createBill, initialState);
  useEffect(() => {
    if (state.status === "success") toast.success(state.message);
    if (state.status === "error") toast.error(state.message);
  }, [state]);

  const activeBills = data.recurringBills.filter((bill) => bill.status === "active");
  const needsReview = activeBills.filter((bill) => !bill.nextDueOn);
  const shownBills = showReviewOnly ? needsReview : data.recurringBills;
  const annualized = activeBills.reduce(
    (sum, bill) => sum + monthlyEquivalent(bill.amountMinor, bill.recurrence) * 12,
    0,
  );
  const subscriptionBurden = activeBills
    .filter((bill) => bill.expenseType === "subscription")
    .reduce(
      (sum, bill) => sum + monthlyEquivalent(bill.amountMinor, bill.recurrence),
      0,
    );

  return (
    <div className="animate-rise space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Expected obligations</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
            Bills and spending plan
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            Normalize monthly, annual, and twice-yearly costs, then reconcile them against
            actual transactions.
          </p>
        </div>
        <button className="button-primary w-fit" onClick={() => setOpen(true)}>
          <Plus size={17} /> Add obligation
        </button>
      </header>

      {needsReview.length > 0 && (
        <button
          className="flex w-full items-center justify-between gap-4 rounded-2xl bg-[var(--amber-soft)] p-4 text-left"
          onClick={() => setShowReviewOnly((value) => !value)}
        >
          <span className="flex items-center gap-3">
            <CircleAlert className="shrink-0 text-[var(--amber)]" size={20} />
            <span>
              <span className="block text-sm font-black">
                {needsReview.length} {needsReview.length === 1 ? "schedule needs" : "schedules need"} review
              </span>
              <span className="mt-0.5 block text-xs text-[var(--muted)]">
                Add renewal or due dates before relying on the upcoming calendar.
              </span>
            </span>
          </span>
          <span className="text-xs font-black text-[var(--amber)]">
            {showReviewOnly ? "Show all" : "Review now"}
          </span>
        </button>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Summary label="True monthly cost" value={formatMoney(recurringBurden(activeBills), data.currency)} />
        <Summary label="Annual commitments" value={formatMoney(annualized, data.currency)} />
        <Summary label="Subscriptions / month" value={formatMoney(subscriptionBurden, data.currency)} />
        <Summary label="Active obligations" value={String(activeBills.length)} />
      </section>

      <section className="card overflow-hidden">
        <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(11.5rem,13.5rem)_minmax(7rem,1fr)_6.25rem_4.5rem] gap-3 border-b border-[var(--line)] px-4 py-2 text-[0.68rem] font-black uppercase tracking-wider text-[var(--muted)] md:grid">
          <span>Obligation</span>
          <span>Schedule</span>
          <span>Funding</span>
          <span className="text-right">Monthly</span>
          <span />
        </div>
        <div className="divide-y divide-[var(--line)]">
          {shownBills.map((bill) => (
            <article
              key={bill.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 px-3 py-2 md:grid-cols-[minmax(0,1.4fr)_minmax(11.5rem,13.5rem)_minmax(7rem,1fr)_6.25rem_4.5rem] md:px-4"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="grid size-7 shrink-0 place-items-center rounded-md bg-[var(--brand-soft)] text-[var(--brand-strong)]">
                  {bill.expenseType === "subscription" ? <CreditCard size={14} /> : <CalendarCheck size={14} />}
                </span>
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-black">{bill.name}</h2>
                  <p className="truncate text-[0.68rem] capitalize text-[var(--muted)]">
                    {bill.expenseType}
                    {bill.essential ? " · Essential" : ""}
                    {bill.status === "paused" ? " · Paused" : ""}
                    <span className="md:hidden">
                      {" · "}
                      {bill.recurrence}
                      {bill.nextDueOn ? ` · ${dueLabel(bill.nextDueOn)}` : ""}
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 md:hidden">
                <p className="text-sm font-black">
                  {formatMoney(monthlyEquivalent(bill.amountMinor, bill.recurrence), bill.currency)}
                </p>
                <BillActions bill={bill} />
              </div>
              <div className="col-span-2 min-w-0 md:col-span-1 md:space-y-1">
                <p className="hidden text-xs capitalize text-[var(--muted)] md:block">
                  {bill.recurrence}
                  {bill.nextDueOn ? ` · ${dueLabel(bill.nextDueOn)}` : ""}
                </p>
                <BillDueDateForm id={bill.id} name={bill.name} nextDueOn={bill.nextDueOn} />
              </div>
              <div className="hidden min-w-0 md:block">
                <p className="truncate text-xs font-bold">
                  {bill.billingAccountLabel ?? "Unassigned"}
                </p>
                <p className="truncate text-[0.68rem] capitalize text-[var(--muted)]">
                  {bill.privacyMask === "virtual_card"
                    ? "Virtual card"
                    : bill.privacyMask === "privacy"
                      ? "Privacy masked"
                      : bill.autopay
                        ? "Autopay"
                        : "Standard"}
                </p>
              </div>
              <div className="hidden text-right md:block">
                <p className="text-sm font-black">
                  {formatMoney(monthlyEquivalent(bill.amountMinor, bill.recurrence), bill.currency)}
                </p>
                <p className="text-[0.68rem] text-[var(--muted)]">
                  {formatMoney(bill.amountMinor, bill.currency)} charged
                </p>
              </div>
              <div className="hidden justify-end gap-1 md:flex">
                <BillActions bill={bill} />
              </div>
            </article>
          ))}
        </div>
      </section>

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-end bg-black/35 backdrop-blur-sm sm:place-items-center sm:p-5"
          onClick={() => setOpen(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            className="max-h-[94vh] w-full overflow-auto rounded-t-3xl bg-[var(--surface)] p-5 sm:max-w-2xl sm:rounded-3xl sm:p-7"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="eyebrow">Expected spending</p>
                <h2 className="mt-1 text-2xl font-black">Add obligation</h2>
              </div>
              <button
                aria-label="Close"
                className="grid size-10 place-items-center"
                onClick={() => setOpen(false)}
              >
                <X size={19} />
              </button>
            </div>
            <form action={action} className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-sm font-bold">Name</span>
                <input className="input" name="name" required placeholder="Rent, insurance, subscription…" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-bold">Amount per charge</span>
                <input className="input" name="amount" type="number" min="0" step="0.01" required placeholder="0.00" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-bold">Cadence</span>
                <select className="input" name="recurrence" defaultValue="monthly">
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="semiannual">Twice yearly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-bold">Type</span>
                <select className="input" name="expenseType" defaultValue="fixed">
                  <option value="fixed">Fixed bill</option>
                  <option value="variable">Variable allowance</option>
                  <option value="subscription">Subscription</option>
                  <option value="insurance">Insurance</option>
                  <option value="contribution">Contribution</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-bold">Next due / renewal</span>
                <input className="input" name="nextDueOn" type="date" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-bold">Billing account</span>
                <input className="input" name="billingAccountLabel" placeholder="Primary checking" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-bold">Payment privacy</span>
                <select className="input" name="privacyMask" defaultValue="none">
                  <option value="none">Standard payment</option>
                  <option value="privacy">Privacy masked</option>
                  <option value="virtual_card">Virtual card</option>
                </select>
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-[var(--line)] p-3">
                <input name="essential" type="checkbox" className="size-4 accent-[var(--brand)]" />
                <span className="text-sm font-bold">Essential expense</span>
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-[var(--line)] p-3">
                <input name="autopay" type="checkbox" className="size-4 accent-[var(--brand)]" />
                <span className="text-sm font-bold">Autopay enabled</span>
              </label>
              <div className="mt-2 flex justify-end gap-2 sm:col-span-2">
                <button type="button" className="button-secondary" onClick={() => setOpen(false)}>
                  Cancel
                </button>
                <button className="button-primary" disabled={pending}>
                  {pending ? <LoaderCircle className="animate-spin" size={17} /> : <Plus size={17} />}
                  Add obligation
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <article className="card p-4">
      <p className="eyebrow">{label}</p>
      <p className="metric-number mt-3 text-2xl font-bold">{value}</p>
    </article>
  );
}

function BillActions({ bill }: { bill: DashboardData["recurringBills"][number] }) {
  return (
    <>
      <button
        title={bill.status === "active" ? "Pause" : "Resume"}
        className="focus-ring grid size-8 place-items-center rounded-lg text-[var(--muted)] hover:bg-[var(--background)]"
        onClick={() => toggleBillStatus(bill.id, bill.status === "active" ? "paused" : "active")}
      >
        {bill.status === "active" ? <Pause size={14} /> : <Play size={14} />}
      </button>
      {bill.nextDueOn && (
        <button
          title="Mark paid"
          className="focus-ring grid size-8 place-items-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand-strong)]"
          onClick={() => markBillPaid(bill.id, bill.nextDueOn!, bill.recurrence)}
        >
          <Check size={14} />
        </button>
      )}
    </>
  );
}

function BillDueDateForm({
  id,
  name,
  nextDueOn,
}: {
  id: string;
  name: string;
  nextDueOn: string | null;
}) {
  const [state, action, pending] = useActionState(setBillDueDate.bind(null, id), initialState);
  useEffect(() => {
    if (state.status === "success") toast.success(state.message);
    if (state.status === "error") toast.error(state.message);
  }, [state]);
  return (
    <form action={action} className="flex gap-1">
      <label className="min-w-0 flex-1">
        <span className="sr-only">Next date for {name}</span>
        <input
          className="input !min-h-0 !rounded-lg !px-2 !py-1 text-xs"
          name="nextDueOn"
          type="date"
          required
          defaultValue={nextDueOn ?? ""}
        />
      </label>
      <button className="button-secondary !min-h-0 !px-2 !py-1 text-xs" disabled={pending}>
        {pending ? <LoaderCircle className="animate-spin" size={13} /> : "Save"}
      </button>
    </form>
  );
}
