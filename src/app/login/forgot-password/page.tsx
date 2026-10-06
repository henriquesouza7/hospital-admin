import Link from "next/link";
import { RequestPasswordResetForm } from "@/components/auth/password-reset-form";

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4 sm:p-6">
      <section className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-6 space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-link">
            Recuperação de acesso
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Criar ou redefinir senha
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            Informe seu email para receber um link seguro de recuperação.
          </p>
        </div>

        <RequestPasswordResetForm />

        <Link
          className="mt-5 block text-center text-sm text-link underline-offset-4 hover:underline"
          href="/login"
        >
          Voltar para o login
        </Link>
      </section>
    </main>
  );
}
