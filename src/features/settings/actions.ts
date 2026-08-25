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
    institution: z.string().trim().max(120).optional(),
    type: z.enum(["checking", "savings", "cash", "credit", "investment", "loan"]),
    purpose: z.enum(["operating", "income_holding", "emergency", "dependent_savings", "investment", "other"]),
    balance: z.string(),
    apy: z.coerce.number().min(0).max(100).default(0),
  }).parse(Object.fromEntries(formData));
  const householdId = await getCurrentHouseholdId();
  const supabase = await createClient();
  if (!householdId || !supabase) throw new Error("No active household.");
  const { error } = await supabase.from("accounts").insert({
    household_id: householdId,
    name: parsed.name,
    institution: parsed.institution || null,
    type: parsed.type,
    purpose: parsed.purpose,
    balance_minor: toMinorUnits(parsed.balance),
    apy: parsed.apy,
    currency: "USD",
    color: "#e68e0d",
    is_archived: false,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
  revalidatePath("/home");
}
