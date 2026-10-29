import Link from "next/link";
import { RequestPasswordResetForm } from "@/components/auth/password-reset-form";
import { RecoveryShell } from "../recovery-shell";

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return (
    <RecoveryShell
      title="Criar ou redefinir senha"
      description="Informe seu email para receber um link seguro de recuperação."
    >
      <RequestPasswordResetForm />
      <Link
        className="mt-6 block text-center text-sm font-medium text-link underline-offset-4 hover:underline focus-visible:underline"
        href="/login"
      >
        Voltar para o login
      </Link>
    </RecoveryShell>
  );
}
