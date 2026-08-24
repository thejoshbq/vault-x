import { z } from "zod";
import { answerFinancialQuestion } from "@/lib/ai/insights";
import { getDashboardData } from "@/lib/data/dashboard";
import { isDemoMode } from "@/lib/env";
import { createFinancialSnapshot } from "@/lib/finance/analytics";
import { rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

const requestSchema = z.object({ question: z.string().trim().min(2).max(500) });

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Ask a question between 2 and 500 characters." }, { status: 400 });
  const supabase = await createClient();
  const {
    data: { user },
  } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
  if (!isDemoMode && !user) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }
  const quotaResult = user && supabase
    ? await supabase.rpc("consume_ai_quota", {
        target_bucket: "ask-vault",
        max_requests: 8,
        window_seconds: 60,
      })
    : null;
  if (quotaResult?.error) {
    console.error("ask-vault quota check failed", { message: quotaResult.error.message });
    return Response.json({ error: "Vault could not verify request limits." }, { status: 500 });
  }
  const databaseAllowed = quotaResult?.data ?? null;
  const localLimiter = user ? null : rateLimit("demo:ask-vault", 8, 60_000);
  const allowed = databaseAllowed ?? localLimiter?.allowed ?? false;
  if (!allowed) return Response.json({ error: "Please wait before asking another question." }, { status: 429 });
  const dashboard = await getDashboardData();
  const snapshot = createFinancialSnapshot(dashboard);
  const answer = await answerFinancialQuestion(snapshot, parsed.data.question);
  return Response.json(
    { answer, period: snapshot.period },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
