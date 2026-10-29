import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/password-reset-form";
import { RecoveryShell } from "../recovery-shell";

type ResetPasswordPageProps = Readonly<{
  searchParams: Promise<{ token?: string }>;
}>;

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const { token } = await searchParams;

  return (
    <RecoveryShell
      title="Defina sua senha"
      description="Escolha uma senha com pelo menos 8 caracteres para acessar o sistema."
    >
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          O link de recuperação está incompleto ou expirou.
        </p>
      )}

      <Link
        className="mt-6 block text-center text-sm font-medium text-link underline-offset-4 hover:underline focus-visible:underline"
        href="/login"
      >
        Voltar para o login
      </Link>
    </RecoveryShell>
  );
}
