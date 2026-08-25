"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isDemoMode } from "@/lib/env";
import { getCurrentHouseholdId } from "@/lib/data/household";
import { toMinorUnits } from "@/lib/finance/money";
import { createClient } from "@/lib/supabase/server";

const transactionSchema = z.object({
  accountId: z.string().min(1),
  categoryId: z.string().optional(),
  incomeSourceId: z.string().optional(),
  kind: z.enum(["income", "expense"]),
  merchant: z.string().trim().min(1).max(160),
  amount: z.string().min(1),
  occurredOn: z.iso.date(),
  note: z.string().max(1000).optional(),
});

export type MutationState = { status?: "success" | "error"; message?: string };

export async function createTransaction(
  _: MutationState,
  formData: FormData,
): Promise<MutationState> {
  const parsed = transactionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message };
  if (isDemoMode) return { status: "success", message: "Preview saved locally for this session." };

  const householdId = await getCurrentHouseholdId();
  const supabase = await createClient();
  if (!householdId || !supabase) return { status: "error", message: "No active household." };
  const amountMinor = toMinorUnits(parsed.data.amount);
  if (amountMinor <= 0) return { status: "error", message: "Amount must be greater than zero." };
  const fingerprint = createHash("sha256")
    .update(`${householdId}|${parsed.data.accountId}|${parsed.data.merchant.toLowerCase()}|${amountMinor}|${parsed.data.occurredOn}`)
    .digest("hex");

  const { error } = await supabase.from("transactions").insert({
    household_id: householdId,
    account_id: parsed.data.accountId,
    category_id: parsed.data.categoryId || null,
    income_source_id: parsed.data.incomeSourceId || null,
    kind: parsed.data.kind,
    merchant: parsed.data.merchant,
    note: parsed.data.note || null,
    amount_minor: amountMinor,
    currency: "USD",
    occurred_on: parsed.data.occurredOn,
    status: "posted",
    fingerprint,
  });
  if (error?.code === "23505") return { status: "error", message: "This looks like a duplicate transaction." };
  if (error) return { status: "error", message: error.message };
  revalidatePath("/home");
  revalidatePath("/transactions");
  return { status: "success", message: "Transaction added." };
}

export async function deleteTransaction(id: string) {
  if (isDemoMode) return;
  const householdId = await getCurrentHouseholdId();
  const supabase = await createClient();
  if (!householdId || !supabase) return;
  await supabase.from("transactions").delete().eq("id", id).eq("household_id", householdId);
  revalidatePath("/transactions");
  revalidatePath("/home");
}
