"use server";

import { randomUUID } from "node:crypto";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { MutationState } from "@/features/transactions/actions";
import { getCurrentHouseholdId } from "@/lib/data/household";
import {
  DEMO_PLAN_COOKIE,
  readDemoState,
  writeDemoState,
  type DemoPlanState,
} from "@/lib/data/demo-state";
import { isDemoMode } from "@/lib/env";
import { toMinorUnits } from "@/lib/finance/money";
import { createClient } from "@/lib/supabase/server";

const goalSchema = z.object({
  name: z.string().trim().min(1).max(100),
  target: z.string().min(1),
  current: z.string().default("0"),
  targetDate: z.string().optional(),
});

const budgetSchema = z.object({
  name: z.string().trim().min(1).max(80),
  categoryId: z.string().min(1),
  limit: z.string().min(1),
});

function revalidatePlan() {
  revalidatePath("/plan");
  revalidatePath("/home");
}

async function patchDemoPlan(updater: (state: DemoPlanState) => DemoPlanState) {
  const current = await readDemoState<DemoPlanState>(DEMO_PLAN_COOKIE, {});
  await writeDemoState(DEMO_PLAN_COOKIE, updater(current));
}

export async function createGoal(_: MutationState, formData: FormData): Promise<MutationState> {
  const parsed = goalSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message };
  if (isDemoMode) {
    await patchDemoPlan((state) => ({
      ...state,
      addedGoals: [
        ...(state.addedGoals ?? []),
        {
          id: `demo-goal-${randomUUID()}`,
          name: parsed.data.name,
          targetMinor: toMinorUnits(parsed.data.target),
          currentMinor: toMinorUnits(parsed.data.current),
          targetDate: parsed.data.targetDate || null,
        },
      ],
    }));
    revalidatePlan();
    return { status: "success", message: "Goal created." };
  }
  const householdId = await getCurrentHouseholdId();
  const supabase = await createClient();
  if (!householdId || !supabase) return { status: "error", message: "No active household." };
  const { error } = await supabase.from("goals").insert({
    household_id: householdId,
    name: parsed.data.name,
    target_minor: toMinorUnits(parsed.data.target),
    current_minor: toMinorUnits(parsed.data.current),
    target_date: parsed.data.targetDate || null,
  });
  if (error) return { status: "error", message: error.message };
  revalidatePlan();
  return { status: "success", message: "Goal created." };
}

export async function updateGoal(id: string, _: MutationState, formData: FormData): Promise<MutationState> {
  const parsed = goalSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message };
  const values = {
    name: parsed.data.name,
    targetMinor: toMinorUnits(parsed.data.target),
    currentMinor: toMinorUnits(parsed.data.current),
    targetDate: parsed.data.targetDate || null,
  };
  if (isDemoMode) {
    await patchDemoPlan((state) => ({
      ...state,
      goals: { ...state.goals, [id]: values },
      addedGoals: (state.addedGoals ?? []).map((goal) => (goal.id === id ? { ...goal, ...values } : goal)),
    }));
    revalidatePlan();
    return { status: "success", message: "Goal updated." };
  }
  const householdId = await getCurrentHouseholdId();
  const supabase = await createClient();
  if (!householdId || !supabase) return { status: "error", message: "No active household." };
  const { error } = await supabase
    .from("goals")
    .update({
      name: values.name,
      target_minor: values.targetMinor,
      current_minor: values.currentMinor,
      target_date: values.targetDate,
    })
    .eq("id", id)
    .eq("household_id", householdId);
  if (error) return { status: "error", message: error.message };
  revalidatePlan();
  return { status: "success", message: "Goal updated." };
}

export async function deleteGoal(id: string): Promise<MutationState> {
  if (isDemoMode) {
    await patchDemoPlan((state) => ({
      ...state,
      deletedGoalIds: [...new Set([...(state.deletedGoalIds ?? []), id])],
      addedGoals: (state.addedGoals ?? []).filter((goal) => goal.id !== id),
    }));
    revalidatePlan();
    return { status: "success", message: "Goal removed." };
  }
  const householdId = await getCurrentHouseholdId();
  const supabase = await createClient();
  if (!householdId || !supabase) return { status: "error", message: "No active household." };
  const { error } = await supabase.from("goals").delete().eq("id", id).eq("household_id", householdId);
  if (error) return { status: "error", message: error.message };
  revalidatePlan();
  return { status: "success", message: "Goal removed." };
}

export async function createBudget(_: MutationState, formData: FormData): Promise<MutationState> {
  const parsed = budgetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message };
  const now = new Date();
  if (isDemoMode) {
    await patchDemoPlan((state) => ({
      ...state,
      addedBudgets: [
        ...(state.addedBudgets ?? []),
        {
          id: `demo-budget-${randomUUID()}`,
          name: parsed.data.name,
          categoryId: parsed.data.categoryId,
          limitMinor: toMinorUnits(parsed.data.limit),
          spentMinor: 0,
          periodStart: format(startOfMonth(now), "yyyy-MM-dd"),
          periodEnd: format(endOfMonth(now), "yyyy-MM-dd"),
        },
      ],
    }));
    revalidatePlan();
    return { status: "success", message: "Budget created." };
  }
  const householdId = await getCurrentHouseholdId();
  const supabase = await createClient();
  if (!householdId || !supabase) return { status: "error", message: "No active household." };
  const { error } = await supabase.from("budgets").insert({
    household_id: householdId,
    category_id: parsed.data.categoryId,
    name: parsed.data.name,
    limit_minor: toMinorUnits(parsed.data.limit),
    period_start: format(startOfMonth(now), "yyyy-MM-dd"),
    period_end: format(endOfMonth(now), "yyyy-MM-dd"),
    rollover: false,
  });
  if (error) return { status: "error", message: error.message };
  revalidatePlan();
  return { status: "success", message: "Budget created." };
}

export async function updateBudget(id: string, _: MutationState, formData: FormData): Promise<MutationState> {
  const parsed = budgetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message };
  const values = {
    name: parsed.data.name,
    categoryId: parsed.data.categoryId,
    limitMinor: toMinorUnits(parsed.data.limit),
  };
  if (isDemoMode) {
    await patchDemoPlan((state) => ({
      ...state,
      budgets: { ...state.budgets, [id]: values },
      addedBudgets: (state.addedBudgets ?? []).map((budget) =>
        budget.id === id ? { ...budget, ...values } : budget,
      ),
    }));
    revalidatePlan();
    return { status: "success", message: "Budget updated." };
  }
  const householdId = await getCurrentHouseholdId();
  const supabase = await createClient();
  if (!householdId || !supabase) return { status: "error", message: "No active household." };
  const { error } = await supabase
    .from("budgets")
    .update({
      name: values.name,
      category_id: values.categoryId,
      limit_minor: values.limitMinor,
    })
    .eq("id", id)
    .eq("household_id", householdId);
  if (error) return { status: "error", message: error.message };
  revalidatePlan();
  return { status: "success", message: "Budget updated." };
}

export async function deleteBudget(id: string): Promise<MutationState> {
  if (isDemoMode) {
    await patchDemoPlan((state) => ({
      ...state,
      deletedBudgetIds: [...new Set([...(state.deletedBudgetIds ?? []), id])],
      addedBudgets: (state.addedBudgets ?? []).filter((budget) => budget.id !== id),
    }));
    revalidatePlan();
    return { status: "success", message: "Budget removed." };
  }
  const householdId = await getCurrentHouseholdId();
  const supabase = await createClient();
  if (!householdId || !supabase) return { status: "error", message: "No active household." };
  const { error } = await supabase.from("budgets").delete().eq("id", id).eq("household_id", householdId);
  if (error) return { status: "error", message: error.message };
  revalidatePlan();
  return { status: "success", message: "Budget removed." };
}
