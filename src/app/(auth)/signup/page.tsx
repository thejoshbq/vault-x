import { AuthForm } from "@/features/auth/auth-form";

export const metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <div className="mt-12">
      <p className="eyebrow">Start with clarity</p>
      <h1 className="mt-2 text-4xl font-black tracking-[-0.045em]">Build a plan you can trust.</h1>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Create your private household workspace. You can invite others later.</p>
      <AuthForm mode="signup" />
    </div>
  );
}
