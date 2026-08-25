"use client";

import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main className="grid min-h-screen place-items-center p-6">
          <section className="card max-w-md p-8 text-center">
            <p className="eyebrow">Something went wrong</p>
            <h1 className="mt-2 text-2xl font-black">Your data is still safe.</h1>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              Vault X could not finish this view. Try again, or return after checking your connection.
            </p>
            {error.digest && <p className="mt-3 text-xs text-[var(--muted)]">Reference {error.digest}</p>}
            <button className="button-primary mt-6" onClick={reset}>Try again</button>
          </section>
        </main>
      </body>
    </html>
  );
}
