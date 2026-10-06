import { Building2 } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";

type LoginPageProps = Readonly<{
  searchParams: Promise<{ error?: string; next?: string }>;
}>;

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, next } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4 sm:p-6">
      <section className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-8 flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex size-11 items-center justify-center rounded-xl bg-primary/70 text-primary-foreground ring-1 ring-primary/50"
          >
            <Building2 className="size-5" />
          </span>
          <div>
            <p className="font-semibold tracking-tight">Hospital Admin</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Gestão administrativa
            </p>
          </div>
        </div>

        <div className="mb-6 space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-link">
            Acesso restrito
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Acesso administrativo
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            Entre com as credenciais administrativas fornecidas pelo responsável
            do projeto.
          </p>
        </div>

        {error === "forbidden" ? (
          <p
            className="mb-5 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
            role="alert"
          >
            Sua conta não tem acesso administrativo.
          </p>
        ) : null}

        <LoginForm next={next} />
      </section>
    </main>
  );
}
