"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export function UpdatePasswordForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  async function update(formData: FormData) {
    const password = String(formData.get("password") ?? "");
    if (password.length < 8) {
      toast.error("Use at least 8 characters.");
      return;
    }
    const supabase = createClient();
    if (!supabase) {
      toast.error("Supabase is not configured.");
      return;
    }
    setPending(true);
    const { error } = await supabase.auth.updateUser({ password });
    setPending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated.");
    router.replace("/home");
  }
  return (
    <form action={update} className="mt-8 space-y-4">
      <label className="block"><span className="mb-1.5 block text-sm font-bold">New password</span><input className="input" name="password" type="password" minLength={8} autoComplete="new-password" required /></label>
      <button className="button-primary w-full" disabled={pending}>{pending && <LoaderCircle className="animate-spin" size={17} />} Update password</button>
    </form>
  );
}
