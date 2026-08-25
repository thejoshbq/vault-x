"use client";

import { Flag, LoaderCircle, Pencil, Plus, SlidersHorizontal, Target, Trash2, TrendingUp, X } from "lucide-react";
import { useActionState, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { DashboardData } from "@/lib/domain";
import { projectScenario } from "@/lib/finance/analytics";
import { formatMoney, fromMinorUnits, percent, toMinorUnits } from "@/lib/finance/money";
import type { MutationState } from "@/features/transactions/actions";
import { createBudget, createGoal, deleteBudget, deleteGoal, updateBudget, updateGoal } from "./actions";

const initialState: MutationState = {};

export function PlanView({
  data,
  categories,
}: {
  data: DashboardData;
  categories: Array<{ id: string; name: string }>;
}) {
  const [modal, setModal] = useState<"goal" | "budget" | null>(null);
  const [editingBudget, setEditingBudget] = useState<DashboardData["budgets"][number] | null>(null);
  const [editingGoal, setEditingGoal] = useState<DashboardData["goals"][number] | null>(null);
  const [scenario, setScenario] = useState({
    income: fromMinorUnits(data.expectedIncomeMinor),
    spending: fromMinorUnits(data.plannedSpendingMinor),
    months: 12,
  });
  const projection = useMemo(
    () => projectScenario(data.accountBalanceMinor, toMinorUnits(scenario.income), toMinorUnits(scenario.spending), scenario.months),
    [data.accountBalanceMinor, scenario],
  );
  const ending = projection.at(-1)?.balanceMinor ?? data.accountBalanceMinor;

  return (
    <div className="animate-rise space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Turn intention into numbers</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Plan</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">Shape this month, fund what matters, and test what-if decisions.</p>
        </div>
        <div className="flex gap-2">
          <button className="button-secondary" onClick={() => setModal("goal")}><Target size={16} /> Add goal</button>
          <button className="button-primary" onClick={() => setModal("budget")}><Plus size={16} /> Add budget</button>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1fr_.85fr]">
        <section className="card p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">Monthly plan</p>
              <h2 className="mt-1 text-xl font-black">Budget progress</h2>
            </div>
            <Flag size={20} className="text-[var(--brand)]" />
          </div>
          <div className="mt-6 space-y-5">
            {data.budgets.length === 0 && <p className="text-sm text-[var(--muted)]">No budgets yet. Add one to track a category this month.</p>}
            {data.budgets.map((budget) => {
              const used = percent(budget.spentMinor, budget.limitMinor);
              return (
                <article key={budget.id} className="rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-black">{budget.name}</h3>
                      <p className="mt-1 text-xs text-[var(--muted)]">{formatMoney(budget.limitMinor - budget.spentMinor, data.currency)} remaining</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-black ${used >= 90 ? "text-[var(--amber)]" : ""}`}>{used}%</p>
                      <button aria-label={`Edit ${budget.name}`} className="focus-ring grid size-8 place-items-center rounded-lg text-[var(--muted)] hover:bg-[var(--background)]" onClick={() => setEditingBudget(budget)}>
                        <Pencil size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-[var(--background)]">
                    <div className={`h-full rounded-full ${used >= 90 ? "bg-[var(--amber)]" : "bg-[var(--brand)]"}`} style={{ width: `${Math.min(used, 100)}%` }} />
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-[var(--muted)]">
                    <span>{formatMoney(budget.spentMinor, data.currency)} spent</span>
                    <span>{formatMoney(budget.limitMinor, data.currency)} limit</span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="card p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">Goals</p>
              <h2 className="mt-1 text-xl font-black">Future funds</h2>
            </div>
            <Target size={20} className="text-[var(--brand)]" />
          </div>
          <div className="mt-6 space-y-4">
            {data.goals.length === 0 && <p className="text-sm text-[var(--muted)]">No goals yet. Add one to track a savings target.</p>}
            {data.goals.map((goal) => {
              const progress = percent(goal.currentMinor, goal.targetMinor);
              return (
                <article key={goal.id} className="rounded-2xl bg-[var(--brand-soft)] p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-black">{goal.name}</h3>
                      <p className="mt-1 text-xs text-[var(--muted)]">{goal.targetDate ? `Target ${goal.targetDate}` : "No target date"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-lg bg-[var(--surface)] px-2 py-1 text-xs font-black">{progress}%</span>
                      <button aria-label={`Edit ${goal.name}`} className="focus-ring grid size-8 place-items-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface)]" onClick={() => setEditingGoal(goal)}>
                        <Pencil size={14} />
                      </button>
                    </div>
                  </div>
                  <p className="metric-number mt-6 text-3xl font-bold">{formatMoney(goal.currentMinor, data.currency)}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">of {formatMoney(goal.targetMinor, data.currency)}</p>
                  <div className="mt-4 h-2 rounded-full bg-[var(--surface)]">
                    <div className="h-full rounded-full bg-[var(--brand)]" style={{ width: `${Math.min(progress, 100)}%` }} />
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>

      <section className="card grid overflow-hidden lg:grid-cols-[.8fr_1.2fr]">
        <div className="border-b border-[var(--line)] p-5 sm:p-7 lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-2 text-[var(--brand-strong)]"><SlidersHorizontal size={18} /><p className="eyebrow !text-current">Scenario lab</p></div>
          <h2 className="mt-2 text-2xl font-black">What if your month changed?</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Adjust income and spending to see a deterministic projection. No AI math, no hidden assumptions.</p>
          <div className="mt-6 space-y-4">
            <label className="block"><span className="mb-1.5 block text-sm font-bold">Monthly income</span><input className="input" type="number" step="50" value={scenario.income} onChange={(event) => setScenario({ ...scenario, income: event.target.value })} /></label>
            <label className="block"><span className="mb-1.5 block text-sm font-bold">Monthly spending</span><input className="input" type="number" step="50" value={scenario.spending} onChange={(event) => setScenario({ ...scenario, spending: event.target.value })} /></label>
            <label className="block"><span className="mb-1.5 flex justify-between text-sm font-bold"><span>Projection</span><span>{scenario.months} months</span></span><input className="w-full accent-[var(--brand)]" type="range" min="3" max="36" step="3" value={scenario.months} onChange={(event) => setScenario({ ...scenario, months: Number(event.target.value) })} /></label>
          </div>
        </div>
        <div className="flex flex-col justify-between bg-[var(--brand-soft)] p-6 text-[var(--ink)] sm:p-8">
          <div>
            <p className="eyebrow text-[var(--brand-strong)]">Projected balance</p>
            <p className="metric-number mt-3 text-5xl font-bold text-[var(--brand-strong)]">
              {formatMoney(ending, data.currency)}
            </p>
            <p className="mt-2 text-sm text-[var(--muted)]">after {scenario.months} months</p>
          </div>
          <div className="mt-12 grid grid-cols-2 gap-4 border-t border-[var(--line)] pt-6">
            <div>
              <p className="text-xs text-[var(--muted)]">Monthly change</p>
              <p className="mt-1 font-black">{formatMoney(toMinorUnits(scenario.income) - toMinorUnits(scenario.spending), data.currency, { signDisplay: "always" })}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--muted)]">Total change</p>
              <p className="mt-1 font-black">{formatMoney(ending - data.accountBalanceMinor, data.currency, { signDisplay: "always" })}</p>
            </div>
          </div>
        </div>
      </section>
      {modal && <PlanningModal type={modal} categories={categories} onClose={() => setModal(null)} />}
      {editingBudget && (
        <BudgetEditor
          budget={editingBudget}
          categories={categories}
          onClose={() => setEditingBudget(null)}
        />
      )}
      {editingGoal && <GoalEditor goal={editingGoal} onClose={() => setEditingGoal(null)} />}
    </div>
  );
}

function PlanningModal({ type, categories, onClose }: { type: "goal" | "budget"; categories: Array<{ id: string; name: string }>; onClose: () => void }) {
  const [state, action, pending] = useActionState(type === "goal" ? createGoal : createBudget, initialState);
  useEffect(() => {
    if (state.status === "success") { toast.success(state.message); onClose(); }
    if (state.status === "error") toast.error(state.message);
  }, [state, onClose]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/35 backdrop-blur-sm sm:place-items-center sm:p-5" onClick={onClose}>
      <section role="dialog" aria-modal="true" className="w-full rounded-t-3xl bg-[var(--surface)] p-5 sm:max-w-lg sm:rounded-3xl sm:p-7" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <p className="eyebrow">Planning</p>
            <h2 className="mt-1 text-2xl font-black">Add {type}</h2>
          </div>
          <button aria-label="Close" className="grid size-10 place-items-center" onClick={onClose}><X size={19} /></button>
        </div>
        <form action={action} className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-sm font-bold">Name</span>
            <input className="input" name="name" required placeholder={type === "goal" ? "Emergency fund" : "Groceries"} />
          </label>
          {type === "goal" ? (
            <>
              <label className="block"><span className="mb-1.5 block text-sm font-bold">Target</span><input className="input" name="target" type="number" min="0.01" step="0.01" required /></label>
              <label className="block"><span className="mb-1.5 block text-sm font-bold">Already saved</span><input className="input" name="current" type="number" min="0" step="0.01" defaultValue="0" /></label>
              <label className="block sm:col-span-2"><span className="mb-1.5 block text-sm font-bold">Target date</span><input className="input" name="targetDate" type="date" /></label>
            </>
          ) : (
            <>
              <label className="block"><span className="mb-1.5 block text-sm font-bold">Monthly limit</span><input className="input" name="limit" type="number" min="0.01" step="0.01" required /></label>
              <label className="block"><span className="mb-1.5 block text-sm font-bold">Category</span><select className="input" name="categoryId">{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
            </>
          )}
          <div className="mt-2 flex justify-end gap-2 sm:col-span-2">
            <button type="button" className="button-secondary" onClick={onClose}>Cancel</button>
            <button className="button-primary" disabled={pending}>{pending ? <LoaderCircle className="animate-spin" size={17} /> : <TrendingUp size={17} />} Save</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function BudgetEditor({
  budget,
  categories,
  onClose,
}: {
  budget: DashboardData["budgets"][number];
  categories: Array<{ id: string; name: string }>;
  onClose: () => void;
}) {
  const [state, action, pending] = useActionState(updateBudget.bind(null, budget.id), initialState);
  useEffect(() => {
    if (state.status === "success") { toast.success(state.message); onClose(); }
    if (state.status === "error") toast.error(state.message);
  }, [state, onClose]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/35 backdrop-blur-sm sm:place-items-center sm:p-5" onClick={onClose}>
      <section role="dialog" aria-modal="true" className="w-full rounded-t-3xl bg-[var(--surface)] p-5 sm:max-w-lg sm:rounded-3xl sm:p-7" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <p className="eyebrow">Planning</p>
            <h2 className="mt-1 text-2xl font-black">Edit budget</h2>
          </div>
          <button aria-label="Close" className="grid size-10 place-items-center" onClick={onClose}><X size={19} /></button>
        </div>
        <form action={action} className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-sm font-bold">Name</span>
            <input className="input" name="name" required defaultValue={budget.name} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-bold">Monthly limit</span>
            <input className="input" name="limit" type="number" min="0.01" step="0.01" required defaultValue={fromMinorUnits(budget.limitMinor)} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-bold">Category</span>
            <select className="input" name="categoryId" defaultValue={budget.categoryId}>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </label>
          <div className="mt-2 flex justify-between gap-2 sm:col-span-2">
            <button
              type="button"
              className="button-quiet text-[var(--danger)]"
              onClick={async () => {
                const result = await deleteBudget(budget.id);
                if (result.status === "success") { toast.success(result.message); onClose(); }
                else toast.error(result.message);
              }}
            >
              <Trash2 size={16} /> Remove
            </button>
            <div className="flex gap-2">
              <button type="button" className="button-secondary" onClick={onClose}>Cancel</button>
              <button className="button-primary" disabled={pending}>{pending ? <LoaderCircle className="animate-spin" size={17} /> : <TrendingUp size={17} />} Save</button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}

function GoalEditor({
  goal,
  onClose,
}: {
  goal: DashboardData["goals"][number];
  onClose: () => void;
}) {
  const [state, action, pending] = useActionState(updateGoal.bind(null, goal.id), initialState);
  useEffect(() => {
    if (state.status === "success") { toast.success(state.message); onClose(); }
    if (state.status === "error") toast.error(state.message);
  }, [state, onClose]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/35 backdrop-blur-sm sm:place-items-center sm:p-5" onClick={onClose}>
      <section role="dialog" aria-modal="true" className="w-full rounded-t-3xl bg-[var(--surface)] p-5 sm:max-w-lg sm:rounded-3xl sm:p-7" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <p className="eyebrow">Planning</p>
            <h2 className="mt-1 text-2xl font-black">Edit goal</h2>
          </div>
          <button aria-label="Close" className="grid size-10 place-items-center" onClick={onClose}><X size={19} /></button>
        </div>
        <form action={action} className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-sm font-bold">Name</span>
            <input className="input" name="name" required defaultValue={goal.name} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-bold">Target</span>
            <input className="input" name="target" type="number" min="0.01" step="0.01" required defaultValue={fromMinorUnits(goal.targetMinor)} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-bold">Already saved</span>
            <input className="input" name="current" type="number" min="0" step="0.01" defaultValue={fromMinorUnits(goal.currentMinor)} />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-sm font-bold">Target date</span>
            <input className="input" name="targetDate" type="date" defaultValue={goal.targetDate ?? ""} />
          </label>
          <div className="mt-2 flex justify-between gap-2 sm:col-span-2">
            <button
              type="button"
              className="button-quiet text-[var(--danger)]"
              onClick={async () => {
                const result = await deleteGoal(goal.id);
                if (result.status === "success") { toast.success(result.message); onClose(); }
                else toast.error(result.message);
              }}
            >
              <Trash2 size={16} /> Remove
            </button>
            <div className="flex gap-2">
              <button type="button" className="button-secondary" onClick={onClose}>Cancel</button>
              <button className="button-primary" disabled={pending}>{pending ? <LoaderCircle className="animate-spin" size={17} /> : <TrendingUp size={17} />} Save</button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}
