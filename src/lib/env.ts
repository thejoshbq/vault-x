const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const hasSupabaseEnv = Boolean(
  publicUrl &&
    publicKey &&
    !publicKey.startsWith("replace-") &&
    !publicUrl.includes("your-project"),
);

export function getSupabaseEnv() {
  if (!hasSupabaseEnv || !publicUrl || !publicKey) {
    throw new Error("Supabase environment variables are not configured");
  }
  return { url: publicUrl, anonKey: publicKey };
}

export const isDemoMode = !hasSupabaseEnv;
