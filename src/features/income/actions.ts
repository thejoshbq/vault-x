"use server";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { MutationState } from "@/features/transactions/actions";
import { getCurrentHouseholdId } from "@/lib/data/household";
import { isDemoMode } from "@/lib/env";
import { toMinorUnits } from "@/lib/finance/money";
import { createClient } from "@/lib/supabase/server";

const incomeSchema = z.object({
  name: z.string().trim().min(1).max(120),
  kind: z.enum(["salary", "hourly", "other"]),
  grossMonthly: z.string(),
  expectedMonthlyCash: z.string(),
  employerBenefitsMonthly: z.string(),
  employeeTaxesMonthly: z.string(),
  employeePretaxMonthly: z.string(),
  hourlyRate: z.string().optional(),
  expectedHoursPerWeek: z.string().optional(),
  variable: z.string().optional(),
  taxTreatment: z.enum(["withheld", "unwithheld", "unknown"]),
  taxReservePercent: z.coerce.number().min(0).max(100),
});

export async function saveIncomeSource(
  id: string | null,
  _: MutationState,
  formData: FormData,
): Promise<MutationState> {
  const parsed = incomeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message };
  let grossMonthlyMinor = toMinorUnits(parsed.data.grossMonthly || "0");
  let expectedMonthlyCashMinor = toMinorUnits(parsed.data.expectedMonthlyCash || "0");
  const employeeTaxesMonthlyMinor = toMinorUnits(parsed.data.employeeTaxesMonthly || "0");
  const employeePretaxMonthlyMinor = toMinorUnits(
    parsed.data.employeePretaxMonthly || "0",
  );
  const hourlyRateMinor = parsed.data.hourlyRate
    ? toMinorUnits(parsed.data.hourlyRate)
    : null;
  const expectedHoursPerWeek = parsed.data.expectedHoursPerWeek
    ? Number(parsed.data.expectedHoursPerWeek)
    : null;
  if (
    parsed.data.kind === "hourly" &&
    hourlyRateMinor !== null &&
    expectedHoursPerWeek !== null
  ) {
    grossMonthlyMinor = Math.round(hourlyRateMinor * expectedHoursPerWeek * (52 / 12));
    expectedMonthlyCashMinor = Math.max(
      grossMonthlyMinor - employeeTaxesMonthlyMinor - employeePretaxMonthlyMinor,
      0,
    );
  }
  if (
    expectedMonthlyCashMinor !==
    grossMonthlyMinor - employeeTaxesMonthlyMinor - employeePretaxMonthlyMinor
  ) {
    return {
      status: "error",
      message: "Spendable cash must equal gross pay minus employee taxes and pre-tax deductions.",
    };
  }
  const employerBenefitsMonthlyMinor = toMinorUnits(
    parsed.data.employerBenefitsMonthly || "0",
  );
  const taxReservePercent =
    parsed.data.taxTreatment === "withheld" ? 0 : parsed.data.taxReservePercent;
  if (isDemoMode) {
    const cookieStore = await cookies();
    const existingValue = cookieStore.get("vault-x-demo-income")?.value;
    let overrides: Record<string, Record<string, unknown>> = {};
    try {
      overrides = existingValue ? JSON.parse(existingValue) : {};
    } catch {
      overrides = {};
    }
    const sourceId = id ?? `demo-${randomUUID()}`;
    overrides[sourceId] = {
      id: sourceId,
      name: parsed.data.name,
      kind: parsed.data.kind,
      grossMonthlyMinor,
      expectedMonthlyCashMinor,
      employerBenefitsMonthlyMinor,
      employeeTaxesMonthlyMinor,
      employeePretaxMonthlyMinor,
      hourlyRateMinor,
      expectedHoursPerWeek,
      variable: parsed.data.variable === "on",
      taxTreatment: parsed.data.taxTreatment,
      taxReservePercent,
      status: "active",
    };
    cookieStore.set("vault-x-demo-income", JSON.stringify(overrides), {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
    revalidatePath("/income");
    revalidatePath("/home");
    revalidatePath("/plan");
    return {
      status: "success",
      message: id ? "Income source updated." : "Income source added.",
    };
  }
  const householdId = await getCurrentHouseholdId();
  const supabase = await createClient();
  if (!householdId || !supabase) return { status: "error", message: "No active household." };
  const values = {
    household_id: householdId,
    name: parsed.data.name,
    kind: parsed.data.kind,
    gross_monthly_minor: grossMonthlyMinor,
    expected_monthly_cash_minor: expectedMonthlyCashMinor,
    employer_benefits_monthly_minor: employerBenefitsMonthlyMinor,
    employee_taxes_monthly_minor: employeeTaxesMonthlyMinor,
    employee_pretax_monthly_minor: employeePretaxMonthlyMinor,
    hourly_rate_minor: hourlyRateMinor,
    expected_hours_per_week: expectedHoursPerWeek,
    variable: parsed.data.variable === "on",
    tax_treatment: parsed.data.taxTreatment,
    tax_reserve_percent: taxReservePercent,
    status: "active" as const,
  };
  const result = id
    ? await supabase.from("income_sources").update(values).eq("id", id).eq("household_id", householdId)
    : await supabase.from("income_sources").insert(values);
  if (result.error) return { status: "error", message: result.error.message };
  revalidatePath("/income");
  revalidatePath("/home");
  revalidatePath("/plan");
  return { status: "success", message: id ? "Income source updated." : "Income source added." };
}
