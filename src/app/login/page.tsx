import "./login.css";
import { Building2, HeartPulse, LockKeyhole, ShieldCheck } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { getEnvironmentLabel } from "@/lib/environment-label";

type LoginPageProps = Readonly<{
  searchParams: Promise<{ error?: string; next?: string; senha?: string }>;
}>;

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, next, senha } = await searchParams;

  return (
    <main className="login-screen flex min-h-screen items-center justify-center p-4 sm:p-8">
      <div className="login-layout grid w-full max-w-[1060px] grid-cols-1 overflow-hidden rounded-[28px] border border-border bg-card">
        <section className="login-left flex min-w-0 items-center justify-center">
          <div className="login-content w-full max-w-[388px]">
            <div className="login-brand-header mb-16 flex items-center gap-4">
              <span
                aria-hidden="true"
                className="login-brand-mark flex size-[54px] items-center justify-center rounded-2xl"
              >
                <Building2 className="size-7" strokeWidth={1.5} />
              </span>
              <div>
                <p className="mb-0.5 text-[17px] font-semibold tracking-tight">
                  Hospital Admin
                </p>
                <p className="text-[13px] text-muted-foreground">
                  {getEnvironmentLabel()}
                </p>
              </div>
            </div>

            <div className="login-heading">
              <p className="login-restricted-label text-link">
                Acesso restrito
              </p>
              <h1 className="login-title">Entre na sua conta</h1>
              <p className="login-subtitle">
                Acesse o sistema com suas credenciais.
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

            {error === "module-access" ? (
              <p
                className="mb-5 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
                role="alert"
              >
                Sua conta não tem permissão para acessar este módulo. Solicite a
                liberação a um administrador.
              </p>
            ) : null}

            {senha === "atualizada" ? (
              <p
                className="mb-5 rounded-lg border border-[var(--status-success-border)] bg-[var(--status-success-bg)] px-3 py-2 text-sm text-[var(--status-success-text)]"
                role="status"
              >
                Senha atualizada. Entre novamente com sua nova senha.
              </p>
            ) : null}

            <LoginForm next={next} />
          </div>
        </section>

        <aside
          aria-label="Informações sobre o acesso ao Hospital Admin"
          className="login-aside relative hidden min-w-0 flex-col justify-between overflow-hidden"
        >
          <div className="login-aside-tag relative z-10 flex items-center gap-2">
            <HeartPulse
              aria-hidden="true"
              className="size-[18px] text-link"
              strokeWidth={1.5}
            />
            Gestão hospitalar
          </div>
          <div className="login-aside-content relative z-10 max-w-[390px] pb-8">
            <div className="login-shield-icon mb-9 flex size-16 items-center justify-center rounded-[20px] text-link">
              <ShieldCheck aria-hidden="true" className="size-8" />
            </div>
            <h2 className="login-aside-title">
              Informação administrativa,
              <br />
              em um só lugar.
            </h2>
            <p className="login-aside-description">
              Acesso destinado aos profissionais autorizados do Hospital Admin.
            </p>
          </div>
          <p className="login-aside-footer relative z-10 flex items-center gap-2">
            <LockKeyhole aria-hidden="true" className="size-3.5" />
            Acesso seguro à gestão administrativa
          </p>
        </aside>
      </div>
    </main>
  );
}
