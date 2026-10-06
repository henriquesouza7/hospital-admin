import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/password-reset-form";

type ResetPasswordPageProps = Readonly<{
  searchParams: Promise<{ token?: string }>;
}>;

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const { token } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4 sm:p-6">
      <section className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-6 space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-link">
            Recuperação de acesso
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Defina sua senha
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            Escolha uma senha com pelo menos 8 caracteres para acessar o
            sistema.
          </p>
        </div>

        {token ? (
          <ResetPasswordForm token={token} />
        ) : (
          <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            O link de recuperação está incompleto ou expirou.
          </p>
        )}

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
