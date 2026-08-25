"use client";

import { ArrowRight, Bot, LoaderCircle, RefreshCw, Send, Sparkles, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import type { DashboardData, Insight } from "@/lib/domain";

type Message = { role: "user" | "assistant"; content: string; period?: string };

export function InsightsView({ data }: { data: DashboardData }) {
  const [insights, setInsights] = useState<Insight[]>(data.insights);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Ask about your monthly cash flow, budgets, recurring burden, savings rate, or top spending categories. I answer only from your current financial snapshot.", period: data.monthLabel },
  ]);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function ask() {
    if (question.trim().length < 2 || asking) return;
    const prompt = question.trim();
    setQuestion("");
    setMessages((current) => [...current, { role: "user", content: prompt }]);
    setAsking(true);
    try {
      const response = await fetch("/api/ai/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: prompt }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setMessages((current) => [...current, { role: "assistant", content: payload.answer, period: payload.period }]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Vault could not answer that question.");
    } finally {
      setAsking(false);
    }
  }

  async function refreshInsights() {
    setRefreshing(true);
    try {
      const response = await fetch("/api/ai/insights", { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setInsights(payload.insights.map((insight: Omit<Insight, "id" | "sourcePeriod">, index: number) => ({ ...insight, id: `new-${index}`, sourcePeriod: payload.period })));
      toast.success("Insights refreshed from the latest snapshot.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Insights could not be refreshed.");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="animate-rise space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="eyebrow">Grounded financial intelligence</p><h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Insights</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">Deterministic calculations first, clear AI explanations second. Every answer is limited to your current snapshot.</p></div>
        <button className="button-secondary w-fit" disabled={refreshing} onClick={refreshInsights}>{refreshing ? <LoaderCircle className="animate-spin" size={16} /> : <RefreshCw size={16} />} Refresh insights</button>
      </header>

      <div className="grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
        <section className="space-y-3">
          {insights.map((insight) => <article key={insight.id} className={`card p-5 ${insight.severity === "attention" ? "border-[color-mix(in_srgb,var(--amber)_35%,var(--line))]" : ""}`}><div className="flex gap-3"><span className={`grid size-10 shrink-0 place-items-center rounded-xl ${insight.severity === "attention" ? "bg-[var(--amber-soft)] text-[var(--amber)]" : "bg-[var(--brand-soft)] text-[var(--brand-strong)]"}`}>{insight.severity === "attention" ? <TriangleAlert size={18} /> : <Sparkles size={18} />}</span><div><p className="eyebrow">{insight.sourcePeriod}</p><h2 className="mt-1 text-base font-black">{insight.title}</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">{insight.body}</p>{insight.actionHref && <Link href={insight.actionHref} className="mt-3 inline-flex items-center gap-1 text-xs font-black text-[var(--brand-strong)]">{insight.actionLabel}<ArrowRight size={13} /></Link>}</div></div></article>)}
          <p className="px-2 text-xs leading-5 text-[var(--muted)]">Vault X provides educational analysis, not professional financial, tax, legal, or investment advice.</p>
        </section>

        <section className="card flex min-h-[36rem] flex-col overflow-hidden">
          <div className="flex items-center gap-3 border-b border-[var(--line)] p-5"><span className="grid size-10 place-items-center rounded-xl bg-[var(--brand)] text-[var(--background)]"><Bot size={19} /></span><div><h2 className="font-black">Ask Vault</h2><p className="text-xs text-[var(--muted)]">Grounded in {data.monthLabel}</p></div></div>
          <div aria-live="polite" className="flex-1 space-y-4 overflow-auto p-5">
            {messages.map((message, index) => <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === "user" ? "bg-[var(--brand)] text-[var(--background)]" : "bg-[var(--background)] text-[var(--ink)]"}`}><p>{message.content}</p>{message.period && <p className="mt-2 text-[0.68rem] font-bold uppercase tracking-wider opacity-55">Source: {message.period} snapshot</p>}</div></div>)}
            {asking && <div className="flex justify-start"><div className="rounded-2xl bg-[var(--background)] px-4 py-3"><LoaderCircle className="animate-spin text-[var(--brand)]" size={18} /></div></div>}
          </div>
          <form className="border-t border-[var(--line)] p-4" onSubmit={(event) => { event.preventDefault(); ask(); }}>
            <div className="flex gap-2"><label className="flex-1"><span className="sr-only">Ask Vault a question</span><input className="input" value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={500} placeholder="Can I afford to save more this month?" /></label><button aria-label="Send question" className="button-primary px-4" disabled={asking || question.trim().length < 2}><Send size={17} /></button></div>
          </form>
        </section>
      </div>
    </div>
  );
}
