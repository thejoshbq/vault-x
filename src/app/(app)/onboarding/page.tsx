import { ArrowRight, Landmark } from "lucide-react";
import { completeOnboarding } from "@/features/onboarding/actions";

export const metadata = { title: "Set up your workspace" };

export default function OnboardingPage() {
  return (
    <div className="mx-auto max-w-2xl animate-rise">
      <div className="text-center"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand-strong)]"><Landmark size={22} /></span><p className="eyebrow mt-5">Two-minute setup</p><h1 className="mt-2 text-4xl font-black tracking-[-0.045em]">Give your plan a starting point.</h1><p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[var(--muted)]">Start with one account. You can add bills, categories, goals, and more from the dashboard.</p></div>
      <form action={completeOnboarding} className="card mt-8 grid gap-5 p-5 sm:grid-cols-2 sm:p-8">
        <label className="block sm:col-span-2"><span className="mb-1.5 block text-sm font-bold">Household name</span><input className="input" name="householdName" defaultValue="My household" required /></label>
        <label className="block sm:col-span-2"><span className="mb-1.5 block text-sm font-bold">Primary currency</span><select className="input" name="currency" defaultValue="USD"><option value="USD">USD — US Dollar</option><option value="EUR">EUR — Euro</option><option value="GBP">GBP — British Pound</option><option value="CAD">CAD — Canadian Dollar</option><option value="AUD">AUD — Australian Dollar</option></select></label>
        <div className="sm:col-span-2"><div className="my-1 h-px bg-[var(--line)]" /><p className="eyebrow mt-5">First account</p></div>
        <label className="block"><span className="mb-1.5 block text-sm font-bold">Account name</span><input className="input" name="accountName" placeholder="Everyday checking" required /></label>
        <label className="block"><span className="mb-1.5 block text-sm font-bold">Institution</span><input className="input" name="institution" placeholder="Bank or provider" /></label>
        <label className="block"><span className="mb-1.5 block text-sm font-bold">Account type</span><select className="input" name="accountType" defaultValue="checking"><option value="checking">Checking</option><option value="savings">Savings</option><option value="cash">Cash</option><option value="credit">Credit card</option><option value="investment">Investment</option><option value="loan">Loan</option></select></label>
        <label className="block"><span className="mb-1.5 block text-sm font-bold">Purpose</span><select className="input" name="accountPurpose" defaultValue="operating"><option value="operating">Operating</option><option value="income_holding">Income holding</option><option value="emergency">Emergency fund</option><option value="dependent_savings">Dependent savings</option><option value="investment">Investment</option><option value="other">Other</option></select></label>
        <label className="block"><span className="mb-1.5 block text-sm font-bold">Current balance</span><input className="input" name="balance" type="number" step="0.01" defaultValue="0.00" required /></label>
        <label className="block"><span className="mb-1.5 block text-sm font-bold">APY</span><input className="input" name="apy" type="number" min="0" step="0.0001" defaultValue="0" /></label>
        <button className="button-primary mt-2 sm:col-span-2">Open my dashboard <ArrowRight size={17} /></button>
      </form>
    </div>
  );
}
