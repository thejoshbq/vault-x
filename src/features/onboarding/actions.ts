"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentHouseholdId } from "@/lib/data/household";
import { isDemoMode } from "@/lib/env";
import { toMinorUnits } from "@/lib/finance/money";
import { createClient } from "@/lib/supabase/server";

export async function completeOnboarding(formData: FormData) {
  if (isDemoMode) redirect("/home");
  const parsed = z.object({
    householdName: z.string().trim().min(1).max(80),
    currency: z.enum(["USD", "EUR", "GBP", "CAD", "AUD"]),
    accountName: z.string().trim().min(1).max(80),
    institution: z.string().trim().max(120).optional(),
    accountType: z.enum(["checking", "savings", "cash", "credit", "investment", "loan"]),
    accountPurpose: z.enum(["operating", "income_holding", "emergency", "dependent_savings", "investment", "other"]),
    balance: z.string().min(1),
    apy: z.coerce.number().min(0).max(100).default(0),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);
  const householdId = await getCurrentHouseholdId();
  const supabase = await createClient();
  if (!householdId || !supabase) throw new Error("No household was created for this account.");
  const balanceMinor = toMinorUnits(parsed.data.balance);
  const { error: householdError } = await supabase
    .from("households")
    .update({ name: parsed.data.householdName, currency: parsed.data.currency })
    .eq("id", householdId);
  if (householdError) throw new Error(householdError.message);
  const { error: accountError } = await supabase.from("accounts").insert({
    household_id: householdId,
    name: parsed.data.accountName,
    institution: parsed.data.institution || null,
    type: parsed.data.accountType,
    purpose: parsed.data.accountPurpose,
    balance_minor: balanceMinor,
    apy: parsed.data.apy,
    currency: parsed.data.currency,
    color: "#e68e0d",
    is_archived: false,
  });
  if (accountError) throw new Error(accountError.message);
  redirect("/home");
}
