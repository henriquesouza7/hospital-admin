import type { Metadata } from "next";
import { Building2, ShieldCheck } from "lucide-react";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = {
  title: "Entrar",
};

type LoginPageProps = Readonly<{
  searchParams: Promise<{ error?: string; next?: string }>;
}>;

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = params.next?.startsWith("/") ? params.next : "/";

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3">
          <span
            aria-hidden="true"
            className="flex size-11 items-center justify-center rounded-xl bg-primary/70 text-primary-foreground ring-1 ring-primary/50"
          >
            <Building2 className="size-5" />
          </span>
          <div>
            <p className="font-semibold tracking-tight">Hospital Admin</p>
            <p className="text-xs text-muted-foreground">
              Gestão administrativa
            </p>
          </div>
        </div>

        <section className="rounded-xl border bg-card p-6 shadow-sm shadow-slate-200/40 sm:p-8">
          <div className="mb-6">
            <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <ShieldCheck aria-hidden="true" className="size-5" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Acesso administrativo
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Entre com seu email e senha para acessar o painel hospitalar.
            </p>
          </div>

          {params.error === "configuration" ? (
            <p
              className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
              role="alert"
            >
              O ambiente ainda precisa ser configurado pelo responsável do
              projeto.
            </p>
          ) : null}

          <LoginForm nextPath={nextPath} />
        </section>

        <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">
          Acesso restrito a usuários administrativos autorizados.
        </p>
      </div>
    </main>
  );
}
