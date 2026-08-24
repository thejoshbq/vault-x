import { AuthForm } from "@/features/auth/auth-form";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="mt-12">
      <p className="eyebrow">Welcome back</p>
      <h1 className="mt-2 text-4xl font-black tracking-[-0.045em]">Make sense of your money.</h1>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Sign in to review your plan, upcoming bills, and latest insights.</p>
      <AuthForm mode="login" />
      <a href="/home" className="button-quiet mt-3 w-full">Explore the preview dashboard</a>
    </div>
  );
}
