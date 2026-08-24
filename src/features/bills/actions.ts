"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentHouseholdId } from "@/lib/data/household";
import { isDemoMode } from "@/lib/env";
import { nextOccurrence } from "@/lib/finance/recurrence";
import { toMinorUnits } from "@/lib/finance/money";
import { createClient } from "@/lib/supabase/server";
import type { MutationState } from "@/features/transactions/actions";

const billSchema = z.object({
  name: z.string().trim().min(1).max(120),
  amount: z.string().min(1),
  recurrence: z.enum(["weekly", "monthly", "quarterly", "yearly"]),
  nextDueOn: z.iso.date(),
  autopay: z.string().optional(),
});

export async function createBill(_: MutationState, formData: FormData): Promise<MutationState> {
  const parsed = billSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message };
  if (isDemoMode) return { status: "success", message: "Bill added in preview mode." };
  const householdId = await getCurrentHouseholdId();
  const supabase = await createClient();
  if (!householdId || !supabase) return { status: "error", message: "No active household." };
  const { error } = await supabase.from("recurring_bills").insert({
    household_id: householdId,
    name: parsed.data.name,
    amount_minor: toMinorUnits(parsed.data.amount),
    currency: "USD",
    recurrence: parsed.data.recurrence,
    next_due_on: parsed.data.nextDueOn,
    autopay: parsed.data.autopay === "on",
    status: "active",
    reminder_days: 3,
  });
  if (error) return { status: "error", message: error.message };
  revalidatePath("/bills");
  revalidatePath("/home");
  return { status: "success", message: "Recurring bill added." };
}

export async function markBillPaid(id: string, currentDueDate: string, recurrence: "weekly" | "monthly" | "quarterly" | "yearly") {
  if (isDemoMode) return;
  const householdId = await getCurrentHouseholdId();
  const supabase = await createClient();
  if (!householdId || !supabase) return;
  await supabase
    .from("recurring_bills")
    .update({ next_due_on: nextOccurrence(currentDueDate, recurrence) })
    .eq("id", id)
    .eq("household_id", householdId);
  revalidatePath("/bills");
  revalidatePath("/home");
}

export async function toggleBillStatus(id: string, status: "active" | "paused") {
  if (isDemoMode) return;
  const householdId = await getCurrentHouseholdId();
  const supabase = await createClient();
  if (!householdId || !supabase) return;
  await supabase.from("recurring_bills").update({ status }).eq("id", id).eq("household_id", householdId);
  revalidatePath("/bills");
}
