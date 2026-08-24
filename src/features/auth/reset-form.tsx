"use client";

import { ArrowRight, LoaderCircle } from "lucide-react";
import { useActionState } from "react";
import { requestPasswordReset, type AuthState } from "./actions";

const initialState: AuthState = {};

export function ResetForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, initialState);
  return (
    <form action={action} className="mt-8 space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-sm font-bold">Email</span>
        <input className="input" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
      </label>
      {state.error && <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm font-bold text-[var(--danger)]">{state.error}</p>}
      {state.message && <p role="status" className="rounded-xl bg-[var(--brand-soft)] p-3 text-sm font-bold text-[var(--brand-strong)]">{state.message}</p>}
      <button className="button-primary w-full" disabled={pending}>
        {pending ? <LoaderCircle className="animate-spin" size={17} /> : <>Send reset link <ArrowRight size={17} /></>}
      </button>
    </form>
  );
}
