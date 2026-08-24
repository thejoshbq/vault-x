"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentHouseholdId } from "@/lib/data/household";
import { isDemoMode } from "@/lib/env";
import { toMinorUnits } from "@/lib/finance/money";
import { createClient } from "@/lib/supabase/server";

export async function createAccount(formData: FormData) {
  if (isDemoMode) return;
  const parsed = z.object({
    name: z.string().trim().min(1).max(80),
    type: z.enum(["checking", "savings", "cash", "credit", "investment", "loan"]),
    balance: z.string(),
  }).parse(Object.fromEntries(formData));
  const householdId = await getCurrentHouseholdId();
  const supabase = await createClient();
  if (!householdId || !supabase) throw new Error("No active household.");
  const { error } = await supabase.from("accounts").insert({
    household_id: householdId,
    name: parsed.name,
    type: parsed.type,
    balance_minor: toMinorUnits(parsed.balance),
    currency: "USD",
    color: "#285d52",
    is_archived: false,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
  revalidatePath("/home");
}
