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
    return `Based on ${snapshot.period}, income is ${(snapshot.incomeMinor / 100).toFixed(2)}, spending is ${(snapshot.spendingMinor / 100).toFixed(2)}, and the current savings rate is ${snapshot.savingsRate}%. Configure an AI provider for a more detailed grounded explanation.`;
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
  insights.push({
    title: snapshot.surplusMinor >= 0 ? "Cash flow is currently positive" : "Spending is ahead of income",
    body: `The deterministic monthly snapshot shows a ${Math.abs(snapshot.surplusMinor / 100).toFixed(2)} ${snapshot.surplusMinor >= 0 ? "surplus" : "shortfall"} and a ${snapshot.savingsRate}% savings rate.`,
    severity: snapshot.surplusMinor >= 0 ? "positive" : "attention",
    actionLabel: "Explore a scenario",
    actionHref: "/plan",
  });
  return insights;
}
