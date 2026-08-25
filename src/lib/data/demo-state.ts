import { cookies } from "next/headers";
import type { DashboardData } from "@/lib/domain";

export const DEMO_BILLS_COOKIE = "vault-x-demo-bills";
export const DEMO_PLAN_COOKIE = "vault-x-demo-plan";

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 30,
  path: "/",
};

export type DemoBillsState = {
  dueDates?: Record<string, string | null>;
  statuses?: Record<string, "active" | "paused">;
  added?: DashboardData["recurringBills"];
};

export type DemoPlanState = {
  budgets?: Record<string, Partial<DashboardData["budgets"][number]>>;
  goals?: Record<string, Partial<DashboardData["goals"][number]>>;
  addedBudgets?: DashboardData["budgets"];
  addedGoals?: DashboardData["goals"];
  deletedBudgetIds?: string[];
  deletedGoalIds?: string[];
};

export async function readDemoState<T>(name: string, fallback: T): Promise<T> {
  const store = await cookies();
  const raw = store.get(name)?.value;
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function writeDemoState(name: string, value: unknown) {
  const store = await cookies();
  store.set(name, JSON.stringify(value), cookieOptions);
}

export function applyDemoBills(
  bills: DashboardData["recurringBills"],
  state: DemoBillsState,
): DashboardData["recurringBills"] {
  const patched = bills.map((bill) => ({
    ...bill,
    nextDueOn:
      state.dueDates && Object.prototype.hasOwnProperty.call(state.dueDates, bill.id)
        ? state.dueDates[bill.id]
        : bill.nextDueOn,
    status: state.statuses?.[bill.id] ?? bill.status,
  }));
  return [...patched, ...(state.added ?? [])];
}

export function applyDemoPlan(
  data: Pick<DashboardData, "budgets" | "goals">,
  state: DemoPlanState,
): Pick<DashboardData, "budgets" | "goals"> {
  const deletedBudgets = new Set(state.deletedBudgetIds ?? []);
  const deletedGoals = new Set(state.deletedGoalIds ?? []);
  return {
    budgets: [
      ...data.budgets
        .filter((budget) => !deletedBudgets.has(budget.id))
        .map((budget) => ({ ...budget, ...(state.budgets?.[budget.id] ?? {}) })),
      ...(state.addedBudgets ?? []),
    ],
    goals: [
      ...data.goals
        .filter((goal) => !deletedGoals.has(goal.id))
        .map((goal) => ({ ...goal, ...(state.goals?.[goal.id] ?? {}) })),
      ...(state.addedGoals ?? []),
    ],
  };
}
