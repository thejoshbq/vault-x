import { UpdatePasswordForm } from "@/features/auth/update-password-form";

export const metadata = { title: "Choose a new password" };

export default function UpdatePasswordPage() {
  return (
    <div className="mt-12">
      <p className="eyebrow">Secure your account</p>
      <h1 className="mt-2 text-4xl font-black tracking-[-0.045em]">Choose a new password.</h1>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Use at least eight characters and avoid a password you use elsewhere.</p>
      <UpdatePasswordForm />
    </div>
  );
}
