import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1fr_1.05fr]">
      <section className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <span className="grid size-10 place-items-center rounded-xl bg-[var(--brand-strong)] font-black text-[var(--background)]">V</span>
            <span className="text-lg font-black">Vault X</span>
          </Link>
          {children}
        </div>
      </section>
      <section className="relative hidden overflow-hidden bg-[var(--brand-strong)] p-12 text-[var(--background)] lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-32 -top-24 size-[34rem] rounded-full border border-white/10" />
        <div className="absolute -right-16 -top-8 size-[26rem] rounded-full border border-white/10" />
        <p className="relative z-10 text-xs font-black uppercase tracking-[0.18em] opacity-70">Your financial copilot</p>
        <div className="relative z-10 max-w-xl">
          <blockquote className="font-serif text-5xl leading-[1.08] tracking-[-0.04em]">
            “Clarity is the first dividend your money should pay.”
          </blockquote>
          <div className="mt-10 grid grid-cols-3 gap-4 border-t border-white/20 pt-7">
            <Stat value="1 view" label="of your full month" />
            <Stat value="< 1 min" label="to scan a receipt" />
            <Stat value="Private" label="household workspace" />
          </div>
        </div>
      </section>
    </main>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return <div><p className="text-lg font-black">{value}</p><p className="mt-1 text-xs leading-5 opacity-65">{label}</p></div>;
}
