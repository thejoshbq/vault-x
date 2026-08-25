import { Database, KeyRound, Landmark, LogOut, Plus, ShieldCheck } from "lucide-react";
import { signOut } from "@/features/auth/actions";
import { createAccount } from "@/features/settings/actions";
import { getDashboardData } from "@/lib/data/dashboard";
import { formatMoney } from "@/lib/finance/money";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const data = await getDashboardData();
  return (
    <div className="mx-auto max-w-5xl animate-rise space-y-6">
      <header><p className="eyebrow">Workspace</p><h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Settings</h1><p className="mt-2 text-sm text-[var(--muted)]">Manage where money lives, your privacy, and cloud connections.</p></header>
      <section className="card p-5 sm:p-6">
        <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand-strong)]"><Landmark size={18} /></span><div><p className="eyebrow">Accounts</p><h2 className="mt-1 text-lg font-black">Financial accounts</h2></div></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {data.accounts.map((account) => <article key={account.id} className="rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] p-4"><div className="flex justify-between gap-4"><div><h3 className="text-sm font-black">{account.name}</h3><p className="mt-1 text-xs capitalize text-[var(--muted)]">{account.institution ? `${account.institution} · ` : ""}{account.purpose.replaceAll("_", " ")}</p></div><p className="text-sm font-black">{formatMoney(account.balanceMinor, account.currency)}</p></div><div className="mt-3 flex justify-between text-xs text-[var(--muted)]"><span className="capitalize">{account.type}{account.ownerLabel ? ` · ${account.ownerLabel}` : ""}</span><span>{account.apy}% APY</span></div></article>)}
        </div>
        <form action={createAccount} className="mt-5 grid gap-3 border-t border-[var(--line)] pt-5 sm:grid-cols-2 lg:grid-cols-6">
          <input className="input" name="name" required placeholder="New account name" />
          <input className="input" name="institution" placeholder="Institution" />
          <select className="input" name="type" defaultValue="checking"><option value="checking">Checking</option><option value="savings">Savings</option><option value="cash">Cash</option><option value="credit">Credit</option><option value="investment">Investment</option><option value="loan">Loan</option></select>
          <select className="input" name="purpose" defaultValue="operating"><option value="operating">Operating</option><option value="income_holding">Income holding</option><option value="emergency">Emergency</option><option value="dependent_savings">Dependent savings</option><option value="investment">Investment</option><option value="other">Other</option></select>
          <input className="input" name="balance" type="number" step="0.01" defaultValue="0.00" required />
          <input className="input" name="apy" type="number" min="0" step="0.0001" defaultValue="0" aria-label="APY" />
          <button className="button-secondary"><Plus size={16} /> Add</button>
        </form>
      </section>
      <div className="grid gap-6 md:grid-cols-2">
        <section className="card p-5 sm:p-6"><ShieldCheck size={22} className="text-[var(--brand)]" /><h2 className="mt-4 text-lg font-black">Privacy and AI</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Receipt images stay in a private bucket. AI receives only the minimum data needed for extraction or a generated aggregate snapshot for insights.</p><div className="mt-5 space-y-3 text-sm"><p className="flex items-center gap-2"><KeyRound size={15} /> Provider keys remain server-only</p><p className="flex items-center gap-2"><Database size={15} /> Household data protected by row policies</p></div></section>
        <section className="card p-5 sm:p-6"><LogOut size={22} className="text-[var(--danger)]" /><h2 className="mt-4 text-lg font-black">Session</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Sign out on this device. Your household data remains available in your private cloud workspace.</p><form action={signOut} className="mt-5"><button className="button-secondary">Sign out</button></form></section>
      </div>
    </div>
  );
}
