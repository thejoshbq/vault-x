"use client";

import { ArrowRight, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { signIn, signUp, type AuthState } from "./actions";

const initialState: AuthState = {};

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [state, action, pending] = useActionState(mode === "login" ? signIn : signUp, initialState);
  return (
    <form action={action} className="mt-8 space-y-4">
      {mode === "signup" && (
        <label className="block">
          <span className="mb-1.5 block text-sm font-bold">Your name</span>
          <input className="input" name="name" autoComplete="name" required placeholder="Alex Morgan" />
        </label>
      )}
      <label className="block">
        <span className="mb-1.5 block text-sm font-bold">Email</span>
        <input className="input" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
      </label>
      <label className="block">
        <span className="mb-1.5 flex items-center justify-between text-sm font-bold">
          <span>Password</span>
          {mode === "login" && <Link className="text-xs text-[var(--brand-strong)]" href="/reset-password">Forgot password?</Link>}
        </span>
        <input className="input" name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} required placeholder="At least 8 characters" />
      </label>
      {state.error && <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm font-bold text-[var(--danger)]">{state.error}</p>}
      {state.message && <p role="status" className="rounded-xl bg-[var(--brand-soft)] p-3 text-sm font-bold text-[var(--brand-strong)]">{state.message}</p>}
      <button className="button-primary w-full" disabled={pending}>
        {pending ? <LoaderCircle className="animate-spin" size={17} /> : <>{mode === "login" ? "Sign in" : "Create account"}<ArrowRight size={17} /></>}
      </button>
      <p className="text-center text-sm text-[var(--muted)]">
        {mode === "login" ? "New to Vault X?" : "Already have an account?"}{" "}
        <Link className="font-black text-[var(--brand-strong)]" href={mode === "login" ? "/signup" : "/login"}>
          {mode === "login" ? "Create an account" : "Sign in"}
        </Link>
      </p>
    </form>
  );
}
