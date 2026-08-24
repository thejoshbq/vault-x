import { WifiOff } from "lucide-react";

export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <section className="card max-w-md p-8 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand-strong)]"><WifiOff size={21} /></span>
        <p className="eyebrow mt-5">You are offline</p>
        <h1 className="mt-2 text-2xl font-black">Reconnect to open your finances.</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Vault X does not cache household financial pages on this device. Your data remains private in the cloud.</p>
        <a className="button-primary mt-6" href="/home">Try again</a>
      </section>
    </main>
  );
}
