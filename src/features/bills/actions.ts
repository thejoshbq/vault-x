"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentHouseholdId } from "@/lib/data/household";
import {
  DEMO_BILLS_COOKIE,
  readDemoState,
  writeDemoState,
  type DemoBillsState,
} from "@/lib/data/demo-state";
import { isDemoMode } from "@/lib/env";
import { nextOccurrence } from "@/lib/finance/recurrence";
import { toMinorUnits } from "@/lib/finance/money";
import { createClient } from "@/lib/supabase/server";
import type { MutationState } from "@/features/transactions/actions";
import type { DashboardData } from "@/lib/domain";

const billSchema = z.object({
  name: z.string().trim().min(1).max(120),
  amount: z.string().min(1),
  recurrence: z.enum(["weekly", "monthly", "quarterly", "semiannual", "yearly"]),
  nextDueOn: z.union([z.iso.date(), z.literal("")]).optional(),
  expenseType: z.enum(["fixed", "variable", "subscription", "insurance", "contribution"]),
  billingAccountLabel: z.string().max(120).optional(),
  privacyMask: z.enum(["none", "privacy", "virtual_card"]).optional(),
  essential: z.string().optional(),
  autopay: z.string().optional(),
});

function revalidateBills() {
  revalidatePath("/bills");
  revalidatePath("/home");
  revalidatePath("/plan");
}

async function patchDemoBills(updater: (state: DemoBillsState) => DemoBillsState) {
  const current = await readDemoState<DemoBillsState>(DEMO_BILLS_COOKIE, {});
  await writeDemoState(DEMO_BILLS_COOKIE, updater(current));
}

export async function createBill(_: MutationState, formData: FormData): Promise<MutationState> {
  const parsed = billSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message };
  if (isDemoMode) {
    const bill: DashboardData["recurringBills"][number] = {
      id: `demo-bill-${randomUUID()}`,
      name: parsed.data.name,
      amountMinor: toMinorUnits(parsed.data.amount),
      currency: "USD",
      recurrence: parsed.data.recurrence,
      nextDueOn: parsed.data.nextDueOn || null,
      categoryId: null,
      autopay: parsed.data.autopay === "on",
      status: "active",
      expenseType: parsed.data.expenseType,
      billingAccountLabel: parsed.data.billingAccountLabel || undefined,
      privacyMask: parsed.data.privacyMask,
      essential: parsed.data.essential === "on",
    };
    await patchDemoBills((state) => ({ ...state, added: [...(state.added ?? []), bill] }));
    revalidateBills();
    return { status: "success", message: "Recurring bill added." };
  }
  const householdId = await getCurrentHouseholdId();
  const supabase = await createClient();
  if (!householdId || !supabase) return { status: "error", message: "No active household." };
  const { error } = await supabase.from("recurring_bills").insert({
    household_id: householdId,
    name: parsed.data.name,
    amount_minor: toMinorUnits(parsed.data.amount),
    currency: "USD",
    recurrence: parsed.data.recurrence,
    next_due_on: parsed.data.nextDueOn || null,
    expense_type: parsed.data.expenseType,
    billing_account_label: parsed.data.billingAccountLabel || null,
    privacy_mask: parsed.data.privacyMask ?? null,
    essential: parsed.data.essential === "on",
    autopay: parsed.data.autopay === "on",
    status: "active",
    reminder_days: 3,
  });
  if (error) return { status: "error", message: error.message };
  revalidateBills();
  return { status: "success", message: "Recurring bill added." };
}

export async function markBillPaid(
  id: string,
  currentDueDate: string,
  recurrence: "weekly" | "monthly" | "quarterly" | "semiannual" | "yearly",
) {
  const nextDueOn = nextOccurrence(currentDueDate, recurrence);
  if (isDemoMode) {
    await patchDemoBills((state) => ({
      ...state,
      dueDates: { ...state.dueDates, [id]: nextDueOn },
    }));
    revalidateBills();
    return;
  }
  const householdId = await getCurrentHouseholdId();
  const supabase = await createClient();
  if (!householdId || !supabase) return;
  await supabase
    .from("recurring_bills")
    .update({ next_due_on: nextDueOn })
    .eq("id", id)
    .eq("household_id", householdId);
  revalidateBills();
}

export async function toggleBillStatus(id: string, status: "active" | "paused") {
  if (isDemoMode) {
    await patchDemoBills((state) => ({
      ...state,
      statuses: { ...state.statuses, [id]: status },
    }));
    revalidatePath("/bills");
    revalidatePath("/home");
    return;
  }
  const householdId = await getCurrentHouseholdId();
  const supabase = await createClient();
  if (!householdId || !supabase) return;
  await supabase.from("recurring_bills").update({ status }).eq("id", id).eq("household_id", householdId);
  revalidatePath("/bills");
  revalidatePath("/home");
}

export async function setBillDueDate(
  id: string,
  _: MutationState,
  formData: FormData,
): Promise<MutationState> {
  const parsed = z.object({ nextDueOn: z.iso.date() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "Choose a valid due date." };
  if (isDemoMode) {
    await patchDemoBills((state) => ({
      ...state,
      dueDates: { ...state.dueDates, [id]: parsed.data.nextDueOn },
    }));
    revalidateBills();
    return { status: "success", message: "Due date updated." };
  }
  const householdId = await getCurrentHouseholdId();
  const supabase = await createClient();
  if (!householdId || !supabase) return { status: "error", message: "No active household." };
  const { error } = await supabase
    .from("recurring_bills")
    .update({ next_due_on: parsed.data.nextDueOn })
    .eq("id", id)
    .eq("household_id", householdId);
  if (error) return { status: "error", message: error.message };
  revalidateBills();
  return { status: "success", message: "Due date updated." };
}
