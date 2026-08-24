import Link from "next/link";
import { ResetForm } from "@/features/auth/reset-form";

export const metadata = { title: "Reset password" };

export default function ResetPasswordPage() {
  return (
    <div className="mt-12">
      <p className="eyebrow">Account recovery</p>
      <h1 className="mt-2 text-4xl font-black tracking-[-0.045em]">Reset your password.</h1>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">We will send a secure recovery link if the address belongs to an account.</p>
      <ResetForm />
      <p className="mt-5 text-center text-sm"><Link className="font-black text-[var(--brand-strong)]" href="/login">Return to sign in</Link></p>
    </div>
  );
}
