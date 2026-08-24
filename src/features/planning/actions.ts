"use server";

import { endOfMonth, format, startOfMonth } from "date-fns";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { MutationState } from "@/features/transactions/actions";
import { getCurrentHouseholdId } from "@/lib/data/household";
import { isDemoMode } from "@/lib/env";
import { toMinorUnits } from "@/lib/finance/money";
import { createClient } from "@/lib/supabase/server";

export async function createGoal(_: MutationState, formData: FormData): Promise<MutationState> {
  const parsed = z.object({
    name: z.string().trim().min(1).max(100),
    target: z.string().min(1),
    current: z.string().default("0"),
    targetDate: z.string().optional(),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message };
  if (isDemoMode) return { status: "success", message: "Goal created in preview mode." };
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
  revalidatePath("/plan");
  return { status: "success", message: "Goal created." };
}

export async function createBudget(_: MutationState, formData: FormData): Promise<MutationState> {
  const parsed = z.object({
    name: z.string().trim().min(1).max(80),
    categoryId: z.string().uuid(),
    limit: z.string().min(1),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message };
  if (isDemoMode) return { status: "success", message: "Budget created in preview mode." };
  const householdId = await getCurrentHouseholdId();
  const supabase = await createClient();
  if (!householdId || !supabase) return { status: "error", message: "No active household." };
  const now = new Date();
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
  revalidatePath("/plan");
  revalidatePath("/home");
  return { status: "success", message: "Budget created." };
}
