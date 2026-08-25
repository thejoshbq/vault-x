"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import type { DashboardData } from "@/lib/domain";
import { formatMoney } from "@/lib/finance/money";

export function CashFlowChart({
  data,
  currency,
}: {
  data: DashboardData["monthlyTrend"];
  currency: DashboardData["currency"];
}) {
  const normalized = data.map((point) => ({
    ...point,
    income: point.incomeMinor / 100,
    spending: point.spendingMinor / 100,
  }));
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={normalized} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 5" />
          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 12 }} dy={8} />
          <Tooltip
            cursor={{ stroke: "var(--line)" }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] p-3 text-xs shadow-xl">
                  <p className="mb-2 font-black">{label}</p>
                  {payload.map((item) => (
                    <p key={String(item.dataKey)} className="mt-1 flex min-w-36 justify-between gap-4 text-[var(--muted)]">
                      <span className="capitalize">{String(item.dataKey)}</span>
                      <strong className="text-[var(--ink)]">{formatMoney(Number(item.value) * 100, currency)}</strong>
                    </p>
                  ))}
                </div>
              ) : null
            }
          />
          <Area type="monotone" dataKey="income" stroke="var(--brand)" strokeWidth={2.5} fill="url(#incomeFill)" />
          <Area type="monotone" dataKey="spending" stroke="var(--danger)" strokeWidth={2} fill="transparent" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
