import { openai } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import { z } from "zod";
import type { FinancialSnapshot } from "@/lib/finance/analytics";

export const insightCardsSchema = z.object({
  insights: z.array(
    z.object({
      title: z.string().max(120),
      body: z.string().max(500),
      severity: z.enum(["positive", "neutral", "attention"]),
      actionLabel: z.string().max(40).nullable(),
      actionHref: z.enum(["/transactions", "/bills", "/plan", "/insights"]).nullable(),
    }),
  ).min(1).max(4),
});

export async function generateInsightCards(snapshot: FinancialSnapshot) {
  if (!process.env.OPENAI_API_KEY) return fallbackInsights(snapshot);
  const { output } = await generateText({
    model: openai(process.env.AI_MODEL ?? "gpt-5-mini"),
    output: Output.object({ schema: insightCardsSchema }),
    system:
      "You are a careful personal-finance analyst. Use only the supplied deterministic snapshot. Never recalculate or invent values. Provide concise observations, explain uncertainty, and avoid professional financial advice or guaranteed outcomes.",
    prompt: `Create actionable insight cards from this snapshot:\n${JSON.stringify(snapshot)}`,
  });
  return output?.insights ?? fallbackInsights(snapshot);
}

export async function answerFinancialQuestion(snapshot: FinancialSnapshot, question: string) {
  if (!process.env.OPENAI_API_KEY) {
    return `Based on ${snapshot.period}, expected spendable income is ${(snapshot.expectedIncomeMinor / 100).toFixed(2)}, normalized planned spending is ${(snapshot.plannedSpendingMinor / 100).toFixed(2)}, and the planned margin is ${(snapshot.plannedMarginMinor / 100).toFixed(2)}. Actual ledger income is ${(snapshot.incomeMinor / 100).toFixed(2)} and actual spending is ${(snapshot.spendingMinor / 100).toFixed(2)}. Configure an AI provider for a more detailed grounded explanation.`;
  }
  const { text } = await generateText({
    model: openai(process.env.AI_MODEL ?? "gpt-5-mini"),
    system:
      "Answer as Vault X, a careful personal-finance copilot. Ground every claim in the provided snapshot. If the snapshot cannot answer the question, say so. Do not give tax, legal, or investment instructions. Keep the response under 180 words.",
    prompt: `Snapshot:\n${JSON.stringify(snapshot)}\n\nUser question:\n${question}`,
  });
  return text;
}

function fallbackInsights(snapshot: FinancialSnapshot): z.infer<typeof insightCardsSchema>["insights"] {
  const insights: z.infer<typeof insightCardsSchema>["insights"] = [];
  const overBudget = snapshot.budgetUtilization.find((budget) => budget.percent >= 90);
  if (overBudget) {
    insights.push({
      title: `${overBudget.name} is nearing its limit`,
      body: `${overBudget.percent}% of this budget is used. Review recent transactions before adding more discretionary spending.`,
      severity: "attention",
      actionLabel: "Review transactions",
      actionHref: "/transactions",
    });
  }
  if (snapshot.setupReviewCount > 0) {
    insights.push({
      title: "Planning assumptions need review",
      body: `${snapshot.setupReviewCount} item${snapshot.setupReviewCount === 1 ? "" : "s"} still lack a due date or tax reserve, so upcoming cash timing is incomplete.`,
      severity: "attention",
      actionLabel: "Review bills",
      actionHref: "/bills",
    });
  }
  insights.push({
    title: snapshot.plannedMarginMinor >= 0 ? "The monthly plan has room" : "Planned obligations exceed income",
    body: `Expected spendable income and normalized obligations produce a ${Math.abs(snapshot.plannedMarginMinor / 100).toFixed(2)} ${snapshot.plannedMarginMinor >= 0 ? "margin" : "shortfall"}. Actual transactions remain separate for reconciliation.`,
    severity: snapshot.plannedMarginMinor >= 0 ? "positive" : "attention",
    actionLabel: "Explore a scenario",
    actionHref: "/plan",
  });
  return insights;
}
