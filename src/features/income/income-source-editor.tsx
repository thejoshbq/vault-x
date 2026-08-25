"use client";

import { LoaderCircle, Pencil, Plus, X } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import type { DashboardData } from "@/lib/domain";
import { fromMinorUnits } from "@/lib/finance/money";
import type { MutationState } from "@/features/transactions/actions";
import { saveIncomeSource } from "./actions";

const initialState: MutationState = {};

export function IncomeSourceEditor({
  source,
}: {
  source?: DashboardData["incomeSources"][number];
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(
    saveIncomeSource.bind(null, source?.id ?? null),
    initialState,
  );
  useEffect(() => {
    if (state.status === "success") toast.success(state.message);
    if (state.status === "error") toast.error(state.message);
  }, [state]);

  return (
    <>
      <button className={source ? "button-quiet" : "button-primary"} onClick={() => setOpen(true)}>
        {source ? <Pencil size={14} /> : <Plus size={16} />}
        {source ? "Edit assumptions" : "Add income source"}
      </button>
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
                <p className="eyebrow">Planning assumptions</p>
                <h2 className="mt-1 text-2xl font-black">
                  {source ? "Update income source" : "Add income source"}
                </h2>
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
                <span className="mb-1.5 block text-sm font-bold">Source name</span>
                <input className="input" name="name" defaultValue={source?.name} required />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-bold">Income type</span>
                <select className="input" name="kind" defaultValue={source?.kind ?? "salary"}>
                  <option value="salary">Salary</option>
                  <option value="hourly">Hourly</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-[var(--line)] p-3">
                <input
                  name="variable"
                  type="checkbox"
                  defaultChecked={source?.variable}
                  className="size-4 accent-[var(--brand)]"
                />
                <span className="text-sm font-bold">Income varies month to month</span>
              </label>
              <MoneyField label="Gross monthly pay" name="grossMonthly" value={source?.grossMonthlyMinor} />
              <MoneyField label="Expected spendable cash" name="expectedMonthlyCash" value={source?.expectedMonthlyCashMinor} />
              <MoneyField label="Employee taxes" name="employeeTaxesMonthly" value={source?.employeeTaxesMonthlyMinor} />
              <MoneyField label="Employee pre-tax deductions" name="employeePretaxMonthly" value={source?.employeePretaxMonthlyMinor} />
              <MoneyField label="Employer-paid benefits (non-cash)" name="employerBenefitsMonthly" value={source?.employerBenefitsMonthlyMinor} />
              <MoneyField label="Hourly rate" name="hourlyRate" value={source?.hourlyRateMinor} optional />
              <label className="block">
                <span className="mb-1.5 block text-sm font-bold">Expected hours / week</span>
                <input
                  className="input"
                  name="expectedHoursPerWeek"
                  type="number"
                  min="0"
                  step="0.25"
                  defaultValue={source?.expectedHoursPerWeek}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-bold">Tax treatment</span>
                <select
                  className="input"
                  name="taxTreatment"
                  defaultValue={source?.taxTreatment ?? "withheld"}
                >
                  <option value="withheld">Taxes withheld</option>
                  <option value="unwithheld">Taxes not withheld</option>
                  <option value="unknown">Needs review</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-bold">Tax reserve percent <span className="font-normal text-[var(--muted)]">(non-withheld only)</span></span>
                <input
                  className="input"
                  name="taxReservePercent"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  defaultValue={source?.taxReservePercent ?? 0}
                />
              </label>
              <div className="mt-2 flex justify-end gap-2 sm:col-span-2">
                <button type="button" className="button-secondary" onClick={() => setOpen(false)}>
                  Cancel
                </button>
                <button className="button-primary" disabled={pending}>
                  {pending ? <LoaderCircle className="animate-spin" size={17} /> : <Plus size={17} />}
                  Save assumptions
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}

function MoneyField({
  label,
  name,
  value,
  optional = false,
}: {
  label: string;
  name: string;
  value?: number;
  optional?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold">{label}</span>
      <input
        className="input"
        name={name}
        type="number"
        min="0"
        step="0.01"
        defaultValue={value === undefined ? (optional ? "" : "0.00") : fromMinorUnits(value)}
      />
    </label>
  );
}
