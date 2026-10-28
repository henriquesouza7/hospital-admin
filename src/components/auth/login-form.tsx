"use client";

import { type FormEvent, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { getSafeRedirectPath } from "@/lib/auth/redirect";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  getLoginErrorMessage,
  getLoginUnavailableMessage,
} from "@/lib/auth/login-error";

type LoginFormProps = Readonly<{ next?: string }>;

export function LoginForm({ next }: LoginFormProps) {
  const [error, setError] = useState<string>();
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();
  const passwordInputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const rememberMe = formData.get("rememberMe") === "on";

    setError(undefined);
    startTransition(async () => {
      try {
        const destination = getSafeRedirectPath(next);
        const response = await fetch("/api/auth/sign-in/email", {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            rememberMe,
            callbackURL: `${window.location.origin}/`,
          }),
        });

        if (!response.ok) {
          const payload: unknown = await response.json().catch(() => null);
          setError(getLoginErrorMessage(response.status, payload));
          return;
        }

        window.location.assign(destination);
      } catch {
        setError(getLoginUnavailableMessage());
      }
    });
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <div className="login-field">
        <label className="text-sm font-medium" htmlFor="email">
          Email
        </label>
        <span className="login-input-wrap">
          <Mail aria-hidden="true" className="login-input-icon" />
          <input
            autoComplete="email"
            className="login-input flex w-full border border-border bg-card placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground admin-field"
            id="email"
            name="email"
            placeholder="voce@hospital.com"
            required
            type="email"
          />
        </span>
      </div>

      <div className="login-field">
        <label className="text-sm font-medium" htmlFor="password">
          Senha
        </label>
        <span className="login-input-wrap">
          <LockKeyhole aria-hidden="true" className="login-input-icon" />
          <input
            ref={passwordInputRef}
            autoComplete="current-password"
            className="login-input login-input-password flex w-full border border-border bg-card placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground admin-field"
            id="password"
            name="password"
            required
            type={showPassword ? "text" : "password"}
          />
          <button
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            aria-pressed={showPassword}
            className="login-password-toggle"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              setShowPassword((current) => !current);
              passwordInputRef.current?.focus();
            }}
            type="button"
          >
            {showPassword ? (
              <EyeOff aria-hidden="true" className="size-4" />
            ) : (
              <Eye aria-hidden="true" className="size-4" />
            )}
          </button>
        </span>
      </div>

      <div className="login-form-options">
        <label className="login-remember-label inline-flex min-h-11 min-w-11 cursor-pointer items-center gap-2.5 rounded-lg">
          <Checkbox defaultChecked name="rememberMe" />
          Lembrar de mim
        </label>
        <Link
          className="login-forgot-link inline-flex min-h-11 items-center rounded-lg underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          href="/login/forgot-password"
        >
          Esqueceu a senha?
        </Link>
      </div>

      {error ? (
        <p
          className="login-form-error rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <Button
        className="login-submit w-full"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  );
}
