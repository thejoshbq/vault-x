"use client";

import {
  Bot,
  CalendarDays,
  ChartNoAxesCombined,
  Home,
  Menu,
  Plus,
  ReceiptText,
  Settings,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { isDemoMode } from "@/lib/env";

const items = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/transactions", label: "Transactions", icon: ReceiptText },
  { href: "/bills", label: "Bills", icon: CalendarDays },
  { href: "/plan", label: "Plan", icon: ChartNoAxesCombined },
  { href: "/insights", label: "Insights", icon: Sparkles },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[16.5rem_1fr]">
      <aside className="sticky top-0 hidden h-screen border-r border-[var(--line)] bg-[var(--surface)] px-4 py-5 lg:flex lg:flex-col">
        <Brand />
        <nav aria-label="Primary navigation" className="mt-9 space-y-1">
          {items.map((item) => (
            <NavLink key={item.href} {...item} active={pathname.startsWith(item.href)} />
          ))}
        </nav>
        <div className="mt-auto space-y-3">
          {isDemoMode && (
            <div className="rounded-xl border border-[var(--line)] bg-[var(--brand-soft)] p-3">
              <p className="eyebrow">Preview mode</p>
              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                Add Supabase keys to connect your own data.
              </p>
            </div>
          )}
          <NavLink href="/settings" label="Settings" icon={Settings} active={pathname.startsWith("/settings")} />
          <div className="flex items-center gap-3 border-t border-[var(--line)] pt-4">
            <div className="grid size-9 place-items-center rounded-full bg-[var(--brand-soft)] text-sm font-bold text-[var(--brand-strong)]">
              VX
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">My household</p>
              <p className="truncate text-xs text-[var(--muted)]">Personal workspace</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--background)_86%,transparent)] px-4 backdrop-blur-xl lg:px-8">
          <div className="flex items-center gap-3">
            <button
              aria-label="Open navigation"
              className="focus-ring grid size-10 place-items-center rounded-xl border border-[var(--line)] bg-[var(--surface)] lg:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={19} />
            </button>
            <div className="lg:hidden"><Brand compact /></div>
          </div>
          <button className="button-primary" onClick={() => setQuickOpen(true)}>
            <Plus size={17} /> <span className="hidden sm:inline">Quick add</span>
          </button>
        </header>
        <main className="mx-auto w-full max-w-[90rem] px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:py-9">
          {children}
        </main>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)}>
          <aside className="h-full w-[82%] max-w-xs bg-[var(--surface)] p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between">
              <Brand />
              <button aria-label="Close navigation" className="focus-ring grid size-10 place-items-center rounded-xl" onClick={() => setMobileOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <nav className="mt-9 space-y-1">
              {items.map((item) => (
                <div key={item.href} onClick={() => setMobileOpen(false)}>
                  <NavLink {...item} active={pathname.startsWith(item.href)} />
                </div>
              ))}
              <NavLink href="/settings" label="Settings" icon={Settings} active={pathname.startsWith("/settings")} />
            </nav>
          </aside>
        </div>
      )}

      {quickOpen && <QuickAdd onClose={() => setQuickOpen(false)} />}
    </div>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/home" className="focus-ring inline-flex items-center gap-2.5 rounded-lg">
      <span className="grid size-9 place-items-center rounded-xl bg-[var(--brand-strong)] text-[var(--background)] shadow-sm">
        <span className="text-sm font-black">V</span>
      </span>
      {!compact && (
        <span>
          <span className="block text-[0.98rem] font-black tracking-tight">Vault X</span>
          <span className="block text-[0.64rem] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">Money, made clear</span>
        </span>
      )}
    </Link>
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof Home;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`focus-ring flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition ${
        active
          ? "bg-[var(--brand-soft)] text-[var(--brand-strong)]"
          : "text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--ink)]"
      }`}
    >
      <Icon size={18} strokeWidth={active ? 2.4 : 1.8} />
      {label}
    </Link>
  );
}

function QuickAdd({ onClose }: { onClose: () => void }) {
  const actions = [
    { href: "/transactions?new=1", label: "Add transaction", detail: "Record income or spending", icon: Plus },
    { href: "/transactions?receipt=1", label: "Scan a receipt", detail: "Capture it with AI", icon: Bot },
    { href: "/bills?new=1", label: "Add recurring bill", detail: "Never miss a due date", icon: CalendarDays },
  ];
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/35 p-0 backdrop-blur-sm sm:place-items-center sm:p-5" onClick={onClose}>
      <section role="dialog" aria-modal="true" aria-labelledby="quick-add-title" className="w-full rounded-t-3xl bg-[var(--surface)] p-5 shadow-2xl sm:max-w-md sm:rounded-3xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <p className="eyebrow">Capture</p>
            <h2 id="quick-add-title" className="mt-1 text-xl font-black">What would you like to add?</h2>
          </div>
          <button aria-label="Close" className="focus-ring grid size-10 place-items-center rounded-xl" onClick={onClose}><X size={19} /></button>
        </div>
        <div className="mt-5 space-y-2">
          {actions.map(({ href, label, detail, icon: Icon }) => (
            <Link key={href} href={href} onClick={onClose} className="focus-ring flex items-center gap-4 rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] p-4 transition hover:-translate-y-0.5 hover:shadow-md">
              <span className="grid size-11 place-items-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand-strong)]"><Icon size={20} /></span>
              <span><span className="block text-sm font-black">{label}</span><span className="mt-0.5 block text-xs text-[var(--muted)]">{detail}</span></span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
