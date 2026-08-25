import { readFile } from "node:fs/promises";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

try {
  process.loadEnvFile(".env.local");
} catch {
  // Environment variables may already be supplied by the shell.
}

const money = z.number().nonnegative();
const sourceKey = z.string().regex(/^[a-z0-9][a-z0-9-]*$/);
const inputSchema = z.object({
  ownerEmail: z.email(),
  householdName: z.string().min(1).max(80),
  currency: z.string().length(3).default("USD"),
  incomeSources: z.array(z.object({
    sourceKey,
    name: z.string().min(1).max(120),
    kind: z.enum(["salary", "hourly", "other"]),
    grossMonthly: money,
    expectedMonthlyCash: money,
    employerBenefitsMonthly: money.default(0),
    employeeTaxesMonthly: money.default(0),
    employeePretaxMonthly: money.default(0),
    hourlyRate: money.nullable().default(null),
    expectedHoursPerWeek: money.nullable().default(null),
    variable: z.boolean().default(false),
    taxTreatment: z.enum(["withheld", "unwithheld", "unknown"]).default("withheld"),
    taxReservePercent: z.number().min(0).max(100).default(0),
    components: z.array(z.object({
      sourceKey,
      name: z.string().min(1).max(160),
      type: z.enum(["gross_pay", "employee_tax", "employee_pretax_deduction", "employer_benefit"]),
      monthlyAmount: money,
    })).default([]),
  })),
  accounts: z.array(z.object({
    sourceKey,
    institution: z.string().min(1),
    name: z.string().min(1),
    type: z.enum(["checking", "savings", "cash", "credit", "investment", "loan"]),
    purpose: z.enum(["operating", "income_holding", "emergency", "dependent_savings", "investment", "other"]),
    ownerLabel: z.string().nullable().default(null),
    balance: z.number(),
    apy: money.default(0),
  })),
  obligations: z.array(z.object({
    sourceKey,
    name: z.string().min(1).max(120),
    category: z.string().min(1),
    amount: money,
    recurrence: z.enum(["weekly", "monthly", "quarterly", "semiannual", "yearly"]),
    nextDueOn: z.iso.date().nullable(),
    expenseType: z.enum(["fixed", "variable", "subscription", "insurance", "contribution"]),
    billingAccountLabel: z.string().nullable().default(null),
    paymentMethod: z.string().nullable().default(null),
    privacyMask: z.enum(["none", "privacy", "virtual_card"]).nullable().default(null),
    essential: z.boolean().default(false),
    autopay: z.boolean().default(false),
    status: z.enum(["active", "paused"]).default("active"),
    notes: z.string().max(1000).nullable().default(null),
  })),
});

const args = process.argv.slice(2);
const validateOnly = args.includes("--validate");
const applyChanges = args.includes("--apply");
const filePath = args.find((argument) => !argument.startsWith("--")) ?? ".private/finance-seed.json";
const input = inputSchema.parse(JSON.parse(await readFile(filePath, "utf8")));
for (const source of input.incomeSources) {
  if (source.taxTreatment === "withheld" && source.taxReservePercent !== 0) {
    throw new Error(`${source.name}: withheld income cannot also have a tax reserve`);
  }
  const calculatedCash =
    source.grossMonthly - source.employeeTaxesMonthly - source.employeePretaxMonthly;
  if (Math.abs(calculatedCash - source.expectedMonthlyCash) > 0.01) {
    throw new Error(
      `${source.name}: expectedMonthlyCash must equal gross minus employee taxes and pre-tax deductions`,
    );
  }
  if (
    source.kind === "hourly" &&
    source.hourlyRate !== null &&
    source.expectedHoursPerWeek !== null
  ) {
    const calculatedMonthly = source.hourlyRate * source.expectedHoursPerWeek * (52 / 12);
    if (Math.abs(calculatedMonthly - source.grossMonthly) > 0.01) {
      throw new Error(
        `${source.name}: grossMonthly must equal hourly rate × expected weekly hours × 52/12`,
      );
    }
  }
  const componentTotals = source.components.reduce(
    (totals, component) => ({
      ...totals,
      [component.type]: totals[component.type] + component.monthlyAmount,
    }),
    {
      gross_pay: 0,
      employee_tax: 0,
      employee_pretax_deduction: 0,
      employer_benefit: 0,
    },
  );
  const expectedTotals = {
    gross_pay: source.grossMonthly,
    employee_tax: source.employeeTaxesMonthly,
    employee_pretax_deduction: source.employeePretaxMonthly,
    employer_benefit: source.employerBenefitsMonthly,
  };
  for (const [componentType, expectedTotal] of Object.entries(expectedTotals)) {
    if (
      source.components.some((component) => component.type === componentType) &&
      Math.abs(componentTotals[componentType] - expectedTotal) > 0.01
    ) {
      throw new Error(`${source.name}: ${componentType} components do not match the source total`);
    }
  }
}
if (validateOnly) {
  console.log(
    `Valid private input: ${input.incomeSources.length} income sources, ${input.accounts.length} accounts, ${input.obligations.length} obligations.`,
  );
  process.exit(0);
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: usersPage, error: usersError } = await supabase.auth.admin.listUsers({
  page: 1,
  perPage: 1000,
});
if (usersError) throw usersError;
const owner = usersPage.users.find(
  (user) => user.email?.toLowerCase() === input.ownerEmail.toLowerCase(),
);
if (!owner) throw new Error(`No Supabase user exists for ${input.ownerEmail}`);

const { data: household, error: householdError } = await supabase
  .from("households")
  .select("id")
  .eq("owner_id", owner.id)
  .single();
if (householdError || !household) throw householdError ?? new Error("Household not found");
const householdId = household.id;

async function summarizeChanges(table, keys) {
  const { data, error } = await supabase
    .from(table)
    .select("source_key")
    .eq("household_id", householdId)
    .not("source_key", "is", null);
  if (error) throw error;
  const existing = new Set(data.map((row) => row.source_key));
  return {
    create: keys.filter((key) => !existing.has(key)).length,
    update: keys.filter((key) => existing.has(key)).length,
    pause: [...existing].filter((key) => !keys.includes(key)).length,
  };
}

if (!applyChanges) {
  const [incomeChanges, accountChanges, obligationChanges] = await Promise.all([
    summarizeChanges(
      "income_sources",
      input.incomeSources.map((source) => source.sourceKey),
    ),
    summarizeChanges(
      "accounts",
      input.accounts.map((account) => account.sourceKey),
    ),
    summarizeChanges(
      "recurring_bills",
      input.obligations.map((obligation) => obligation.sourceKey),
    ),
  ]);
  console.log("Private finance import dry run:");
  console.log(`  Income sources: ${incomeChanges.create} create, ${incomeChanges.update} update, ${incomeChanges.pause} pause`);
  console.log(`  Accounts: ${accountChanges.create} create, ${accountChanges.update} update, ${accountChanges.pause} archive`);
  console.log(`  Obligations: ${obligationChanges.create} create, ${obligationChanges.update} update, ${obligationChanges.pause} pause`);
  console.log("No changes applied. Run npm run data:import:apply to continue.");
  process.exit(0);
}

const { error: householdUpdateError } = await supabase
  .from("households")
  .update({ name: input.householdName, currency: input.currency })
  .eq("id", householdId);
if (householdUpdateError) throw householdUpdateError;

const toMinor = (amount) => Math.round(amount * 100);

async function upsertBySource(table, values) {
  const { data: existing, error: lookupError } = await supabase
    .from(table)
    .select("id")
    .eq("household_id", householdId)
    .eq("source_key", values.source_key)
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (existing) {
    const { error } = await supabase.from(table).update(values).eq("id", existing.id);
    if (error) throw error;
    return existing.id;
  }
  const { data, error } = await supabase.from(table).insert(values).select("id").single();
  if (error) throw error;
  return data.id;
}

for (const source of input.incomeSources) {
  const incomeSourceId = await upsertBySource("income_sources", {
    household_id: householdId,
    source_key: source.sourceKey,
    name: source.name,
    kind: source.kind,
    gross_monthly_minor: toMinor(source.grossMonthly),
    expected_monthly_cash_minor: toMinor(source.expectedMonthlyCash),
    employer_benefits_monthly_minor: toMinor(source.employerBenefitsMonthly),
    employee_taxes_monthly_minor: toMinor(source.employeeTaxesMonthly),
    employee_pretax_monthly_minor: toMinor(source.employeePretaxMonthly),
    hourly_rate_minor: source.hourlyRate === null ? null : toMinor(source.hourlyRate),
    expected_hours_per_week: source.expectedHoursPerWeek,
    variable: source.variable,
    tax_treatment: source.taxTreatment,
    tax_reserve_percent: source.taxReservePercent,
    status: "active",
  });
  for (const component of source.components) {
    const { data: existing } = await supabase
      .from("income_components")
      .select("id")
      .eq("income_source_id", incomeSourceId)
      .eq("source_key", component.sourceKey)
      .maybeSingle();
    const values = {
      household_id: householdId,
      income_source_id: incomeSourceId,
      source_key: component.sourceKey,
      name: component.name,
      component_type: component.type,
      monthly_amount_minor: toMinor(component.monthlyAmount),
    };
    const result = existing
      ? await supabase.from("income_components").update(values).eq("id", existing.id)
      : await supabase.from("income_components").insert(values);
    if (result.error) throw result.error;
  }
  const componentKeys = new Set(source.components.map((component) => component.sourceKey));
  const { data: importedComponents, error: importedComponentError } = await supabase
    .from("income_components")
    .select("id,source_key")
    .eq("income_source_id", incomeSourceId)
    .not("source_key", "is", null);
  if (importedComponentError) throw importedComponentError;
  for (const component of importedComponents) {
    if (component.source_key && !componentKeys.has(component.source_key)) {
      const { error } = await supabase.from("income_components").delete().eq("id", component.id);
      if (error) throw error;
    }
  }
}

for (const account of input.accounts) {
  await upsertBySource("accounts", {
    household_id: householdId,
    source_key: account.sourceKey,
    institution: account.institution,
    name: account.name,
    type: account.type,
    purpose: account.purpose,
    owner_label: account.ownerLabel,
    balance_minor: toMinor(account.balance),
    currency: input.currency,
    apy: account.apy,
    color: "#e68e0d",
    is_archived: false,
  });
}

const { data: existingCategories, error: categoryError } = await supabase
  .from("categories")
  .select("id,name")
  .eq("household_id", householdId)
  .eq("kind", "expense");
if (categoryError) throw categoryError;
const categoryIds = new Map(existingCategories.map((category) => [category.name.toLowerCase(), category.id]));

for (const obligation of input.obligations) {
  let categoryId = categoryIds.get(obligation.category.toLowerCase());
  if (!categoryId) {
    const { data: created, error } = await supabase
      .from("categories")
      .insert({
        household_id: householdId,
        name: obligation.category,
        kind: "expense",
        color: "#6f8e63",
        icon: "circle",
        is_system: false,
      })
      .select("id")
      .single();
    if (error) throw error;
    categoryId = created.id;
    categoryIds.set(obligation.category.toLowerCase(), categoryId);
  }
  await upsertBySource("recurring_bills", {
    household_id: householdId,
    source_key: obligation.sourceKey,
    category_id: categoryId,
    name: obligation.name,
    amount_minor: toMinor(obligation.amount),
    currency: input.currency,
    recurrence: obligation.recurrence,
    next_due_on: obligation.nextDueOn,
    expense_type: obligation.expenseType,
    billing_account_label: obligation.billingAccountLabel,
    payment_method: obligation.paymentMethod,
    privacy_mask: obligation.privacyMask,
    essential: obligation.essential,
    autopay: obligation.autopay,
    status: obligation.status,
    reminder_days: 3,
    notes: obligation.notes,
  });
  if (obligation.expenseType === "variable" && obligation.recurrence === "monthly") {
    const now = new Date();
    const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
      .toISOString()
      .slice(0, 10);
    const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0))
      .toISOString()
      .slice(0, 10);
    const { data: existingBudget, error: budgetLookupError } = await supabase
      .from("budgets")
      .select("id")
      .eq("household_id", householdId)
      .eq("category_id", categoryId)
      .eq("period_start", periodStart)
      .maybeSingle();
    if (budgetLookupError) throw budgetLookupError;
    const budgetValues = {
      household_id: householdId,
      category_id: categoryId,
      name: obligation.name,
      limit_minor: toMinor(obligation.amount),
      period_start: periodStart,
      period_end: periodEnd,
      rollover: false,
    };
    const budgetResult = existingBudget
      ? await supabase.from("budgets").update(budgetValues).eq("id", existingBudget.id)
      : await supabase.from("budgets").insert(budgetValues);
    if (budgetResult.error) throw budgetResult.error;
  }
}

async function pauseMissingImports(table, activeKeys, patch) {
  const { data: importedRows, error } = await supabase
    .from(table)
    .select("id,source_key")
    .eq("household_id", householdId)
    .not("source_key", "is", null);
  if (error) throw error;
  for (const row of importedRows) {
    if (row.source_key && !activeKeys.has(row.source_key)) {
      const { error: updateError } = await supabase.from(table).update(patch).eq("id", row.id);
      if (updateError) throw updateError;
    }
  }
}

await pauseMissingImports(
  "income_sources",
  new Set(input.incomeSources.map((source) => source.sourceKey)),
  { status: "paused" },
);
await pauseMissingImports(
  "accounts",
  new Set(input.accounts.map((account) => account.sourceKey)),
  { is_archived: true },
);
await pauseMissingImports(
  "recurring_bills",
  new Set(input.obligations.map((obligation) => obligation.sourceKey)),
  { status: "paused" },
);

await supabase.from("audit_events").insert({
  household_id: householdId,
  actor_id: owner.id,
  action: "private_finance.imported",
  entity_type: "household",
  entity_id: householdId,
  metadata: {
    income_sources: input.incomeSources.length,
    accounts: input.accounts.length,
    obligations: input.obligations.length,
    imported_at: new Date().toISOString(),
  },
});

console.log(
  `Imported ${input.incomeSources.length} income sources, ${input.accounts.length} accounts, and ${input.obligations.length} obligations into ${input.householdName}.`,
);
