import { format, startOfMonth } from "date-fns";
import { generateInsightCards } from "@/lib/ai/insights";
import { getDashboardData } from "@/lib/data/dashboard";
import { getCurrentHouseholdId } from "@/lib/data/household";
import { isDemoMode } from "@/lib/env";
import { createFinancialSnapshot } from "@/lib/finance/analytics";
import { rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
  if (!isDemoMode && !user) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }
  const quotaResult = user && supabase
    ? await supabase.rpc("consume_ai_quota", {
        target_bucket: "refresh-insights",
        max_requests: 3,
        window_seconds: 3600,
      })
    : null;
  if (quotaResult?.error) {
    console.error("insight quota check failed", { message: quotaResult.error.message });
    return Response.json({ error: "Vault could not verify request limits." }, { status: 500 });
  }
  const databaseAllowed = quotaResult?.data ?? null;
  const localLimiter = user ? null : rateLimit("demo:refresh-insights", 3, 60 * 60_000);
  if (!(databaseAllowed ?? localLimiter?.allowed ?? false)) {
    return Response.json({ error: "Insights were refreshed recently. Try again later." }, { status: 429 });
  }
  const dashboard = await getDashboardData();
  const snapshot = createFinancialSnapshot(dashboard);
  const snapshotJson = JSON.parse(JSON.stringify(snapshot)) as Json;
  const insights = await generateInsightCards(snapshot);
  if (!isDemoMode && supabase) {
    const householdId = await getCurrentHouseholdId();
    if (!householdId) return Response.json({ error: "No active household." }, { status: 400 });
    const now = new Date();
    const { data: run, error: runError } = await supabase.from("insight_runs").insert({
      household_id: householdId,
      status: "completed",
      period_start: format(startOfMonth(now), "yyyy-MM-dd"),
      period_end: format(now, "yyyy-MM-dd"),
      snapshot: snapshotJson,
      provider: process.env.OPENAI_API_KEY ? "openai" : "deterministic",
      model: process.env.OPENAI_API_KEY ? (process.env.AI_MODEL ?? "gpt-5-mini") : null,
      completed_at: now.toISOString(),
    }).select("id").single();
    if (runError) return Response.json({ error: runError.message }, { status: 500 });
    await supabase.from("insights").insert(insights.map((insight) => ({
      household_id: householdId,
      insight_run_id: run.id,
      title: insight.title,
      body: insight.body,
      severity: insight.severity,
      action_label: insight.actionLabel,
      action_href: insight.actionHref,
      source_period: snapshot.period,
    })));
  }
  return Response.json({ insights, period: snapshot.period });
}
