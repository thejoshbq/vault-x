"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const credentials = z.object({
  email: z.email(),
  password: z.string().min(8, "Use at least 8 characters"),
});

export type AuthState = { error?: string; message?: string };

export async function signIn(_: AuthState, formData: FormData): Promise<AuthState> {
  if (!hasSupabaseEnv) return { message: "Preview mode is active. Open the dashboard to explore." };
  const parsed = credentials.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const supabase = await createClient();
  const { error } = await supabase!.auth.signInWithPassword(parsed.data);
  if (error) return { error: error.message };
  redirect("/home");
}

export async function signUp(_: AuthState, formData: FormData): Promise<AuthState> {
  if (!hasSupabaseEnv) return { message: "Configure Supabase to create an account." };
  const parsed = credentials.extend({ name: z.string().min(2) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const supabase = await createClient();
  const { error } = await supabase!.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { name: parsed.data.name } },
  });
  if (error) return { error: error.message };
  return { message: "Check your inbox to confirm your email." };
}

export async function requestPasswordReset(
  _: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = z.object({ email: z.email() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Enter a valid email address." };
  if (!hasSupabaseEnv) return { message: "Configure Supabase to send password reset emails." };
  const supabase = await createClient();
  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/auth/callback?next=/update-password`;
  const { error } = await supabase!.auth.resetPasswordForEmail(parsed.data.email, { redirectTo });
  if (error) return { error: error.message };
  return { message: "If that account exists, a reset link is on its way." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase?.auth.signOut();
  redirect("/login");
}
