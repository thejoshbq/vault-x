import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/app-shell";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  if (hasSupabaseEnv) {
    const supabase = await createClient();
    const {
      data: { user },
    } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
    if (!user) redirect("/login");
  }

  return <AppShell previewMode={!hasSupabaseEnv}>{children}</AppShell>;
}
