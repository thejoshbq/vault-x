import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Snapshot = {
  period: string;
  expectedIncomeMinor: number;
  plannedSpendingMinor: number;
  plannedMarginMinor: number;
  incomeMinor: number;
  spendingMinor: number;
  surplusMinor: number;
  savingsRate: number;
  recurringBurdenMinor: number;
  emergencyRunwayMonths: number;
  setupReviewCount: number;
  budgetUtilization: Array<{ name: string; percent: number }>;
};

type Card = {
  title: string;
  body: string;
  severity: "positive" | "neutral" | "attention";
  actionLabel: string | null;
  actionHref: "/transactions" | "/bills" | "/plan" | null;
};

interface InsightProvider {
  generate(snapshot: Snapshot): Promise<Card[]>;
}

class OpenAIInsightProvider implements InsightProvider {
  async generate(snapshot: Snapshot) {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return fallback(snapshot);
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: Deno.env.get("AI_MODEL") ?? "gpt-5-mini",
        instructions:
          "Use only supplied deterministic values. Never invent calculations or guarantee outcomes. Produce concise educational personal-finance observations, not professional advice.",
        input: `Generate 2 to 4 actionable insight cards from this snapshot: ${JSON.stringify(snapshot)}`,
        text: {
          format: {
            type: "json_schema",
            name: "financial_insights",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["insights"],
              properties: {
                insights: {
                  type: "array",
                  minItems: 2,
                  maxItems: 4,
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: ["title", "body", "severity", "actionLabel", "actionHref"],
                    properties: {
                      title: { type: "string", maxLength: 120 },
                      body: { type: "string", maxLength: 500 },
                      severity: { type: "string", enum: ["positive", "neutral", "attention"] },
                      actionLabel: { type: ["string", "null"] },
                      actionHref: { type: ["string", "null"], enum: ["/transactions", "/bills", "/plan", null] },
                    },
                  },
                },
              },
            },
          },
        },
      }),
    });
    if (!response.ok) throw new Error(`AI provider returned ${response.status}`);
    const payload = await response.json();
    const outputText = payload.output_text ??
      payload.output?.flatMap((item: { content?: Array<{ text?: string }> }) => item.content ?? []).find((item: { text?: string }) => item.text)?.text;
    if (!outputText) throw new Error("AI provider returned no output");
    return (JSON.parse(outputText) as { insights: Card[] }).insights;
  }
}

function fallback(snapshot: Snapshot): Card[] {
  const card: Card = snapshot.plannedMarginMinor >= 0
    ? { title: "The monthly plan has room", body: `Expected spendable income exceeds normalized obligations by ${(snapshot.plannedMarginMinor / 100).toFixed(2)}. Actual cash flow should still be reconciled as transactions arrive.`, severity: "positive", actionLabel: "Explore a scenario", actionHref: "/plan" }
    : { title: "Planned obligations exceed income", body: `The expected monthly plan is short by ${(Math.abs(snapshot.plannedMarginMinor) / 100).toFixed(2)} before actual transactions are considered.`, severity: "attention", actionLabel: "Review bills", actionHref: "/bills" };
  const budget = snapshot.budgetUtilization.find((item) => item.percent >= 90);
  return budget
    ? [card, { title: `${budget.name} needs attention`, body: `${budget.percent}% of this budget has been used.`, severity: "attention", actionLabel: "Review the plan", actionHref: "/plan" }]
    : [card, { title: "Recurring commitments are visible", body: `Active bills normalize to ${(snapshot.recurringBurdenMinor / 100).toFixed(2)} per month.`, severity: "neutral", actionLabel: "Review bills", actionHref: "/bills" }];
}

function monthBounds() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  return { now, start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

async function secretsMatch(provided: string | null, expected: string | undefined) {
  if (!provided || !expected) return false;
  const encoder = new TextEncoder();
  const [providedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(provided)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const left = new Uint8Array(providedHash);
  const right = new Uint8Array(expectedHash);
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

Deno.serve(async (request) => {
  if (!(await secretsMatch(request.headers.get("x-cron-secret"), Deno.env.get("CRON_SECRET")))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const provider: InsightProvider = new OpenAIInsightProvider();
  const { householdId } = await request.json().catch(() => ({ householdId: null }));
  const householdQuery = supabase.from("households").select("id,currency");
  if (householdId) householdQuery.eq("id", householdId);
  const { data: households, error } = await householdQuery;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const { now, start, end } = monthBounds();
  const results = [];
  for (const household of households ?? []) {
    const [{ data: transactions }, { data: bills }, { data: budgets }, { data: incomeSources }, { data: accounts }] = await Promise.all([
      supabase.from("transactions").select("kind,amount_minor,category_id").eq("household_id", household.id).gte("occurred_on", start).lte("occurred_on", end),
      supabase.from("recurring_bills").select("amount_minor,recurrence,status,next_due_on,essential").eq("household_id", household.id),
      supabase.from("budgets").select("name,category_id,limit_minor").eq("household_id", household.id).lte("period_start", end).gte("period_end", start),
      supabase.from("income_sources").select("expected_monthly_cash_minor,tax_reserve_percent,tax_treatment,status").eq("household_id", household.id),
      supabase.from("accounts").select("balance_minor,purpose").eq("household_id", household.id).eq("is_archived", false),
    ]);
    const incomeMinor = (transactions ?? []).filter((item) => item.kind === "income").reduce((sum, item) => sum + item.amount_minor, 0);
    const spendingMinor = (transactions ?? []).filter((item) => item.kind === "expense").reduce((sum, item) => sum + item.amount_minor, 0);
    const factors: Record<string, number> = { weekly: 52 / 12, monthly: 1, quarterly: 1 / 3, semiannual: 1 / 6, yearly: 1 / 12 };
    const activeBills = (bills ?? []).filter((bill) => bill.status === "active");
    const activeIncomeSources = (incomeSources ?? []).filter((source) => source.status === "active");
    const expectedIncomeMinor = activeIncomeSources.reduce(
      (sum, source) =>
        source.tax_treatment !== "withheld" && source.tax_reserve_percent === 0
          ? sum
          : sum +
            source.expected_monthly_cash_minor -
            (source.tax_treatment === "withheld"
              ? 0
              : Math.round(
                  source.expected_monthly_cash_minor * (source.tax_reserve_percent / 100),
                )),
      0,
    );
    const plannedSpendingMinor = activeBills.reduce(
      (sum, bill) => sum + Math.round(bill.amount_minor * factors[bill.recurrence]),
      0,
    );
    const essentialMonthly = activeBills
      .filter((bill) => bill.essential)
      .reduce((sum, bill) => sum + Math.round(bill.amount_minor * factors[bill.recurrence]), 0);
    const emergencyBalance = (accounts ?? [])
      .filter((account) => account.purpose === "emergency")
      .reduce((sum, account) => sum + account.balance_minor, 0);
    const snapshot: Snapshot = {
      period: now.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }),
      expectedIncomeMinor,
      plannedSpendingMinor,
      plannedMarginMinor: expectedIncomeMinor - plannedSpendingMinor,
      incomeMinor,
      spendingMinor,
      surplusMinor: incomeMinor - spendingMinor,
      savingsRate: incomeMinor ? Math.round(((incomeMinor - spendingMinor) / incomeMinor) * 100) : 0,
      recurringBurdenMinor: plannedSpendingMinor,
      emergencyRunwayMonths: essentialMonthly ? emergencyBalance / essentialMonthly : 0,
      setupReviewCount:
        activeBills.filter((bill) => bill.next_due_on === null).length +
        activeIncomeSources.filter(
          (source) => source.tax_treatment !== "withheld" && source.tax_reserve_percent === 0,
        ).length,
      budgetUtilization: (budgets ?? []).map((budget) => ({
        name: budget.name,
        percent: budget.limit_minor ? Math.round(((transactions ?? []).filter((item) => item.kind === "expense" && item.category_id === budget.category_id).reduce((sum, item) => sum + item.amount_minor, 0) / budget.limit_minor) * 100) : 0,
      })),
    };
    try {
      const cards = await provider.generate(snapshot);
      const { data: run } = await supabase.from("insight_runs").insert({
        household_id: household.id, status: "completed", period_start: start, period_end: end,
        snapshot, provider: Deno.env.get("OPENAI_API_KEY") ? "openai" : "deterministic",
        model: Deno.env.get("OPENAI_API_KEY") ? (Deno.env.get("AI_MODEL") ?? "gpt-5-mini") : null,
        completed_at: new Date().toISOString(),
      }).select("id").single();
      await supabase.from("insights").insert(cards.map((card) => ({
        household_id: household.id, insight_run_id: run?.id, title: card.title, body: card.body,
        severity: card.severity, action_label: card.actionLabel, action_href: card.actionHref,
        source_period: snapshot.period,
      })));
      results.push({ householdId: household.id, status: "completed", count: cards.length });
    } catch (caught) {
      results.push({ householdId: household.id, status: "failed", error: caught instanceof Error ? caught.message : "Unknown error" });
    }
  }
  return Response.json({ results });
});
