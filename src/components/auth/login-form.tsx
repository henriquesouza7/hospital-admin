"use client";

import { type FormEvent, useState, useTransition } from "react";
import Link from "next/link";
import { getSafeRedirectPath } from "@/lib/auth/redirect";

type LoginFormProps = Readonly<{ next?: string }>;

export function LoginForm({ next }: LoginFormProps) {
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    setError(undefined);
    startTransition(async () => {
      try {
        const response = await fetch("/api/auth/sign-in/email", {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            callbackURL: `${window.location.origin}/`,
          }),
        });

        if (!response.ok) {
          setError("Email ou senha inválidos.");
          return;
        }

        window.location.assign(getSafeRedirectPath(next));
      } catch {
        setError("O login está indisponível no momento.");
      }
    });
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="email">
          Email
        </label>
        <input
          autoComplete="email"
          className="flex h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
          id="email"
          name="email"
          placeholder="voce@hospital.com"
          required
          type="email"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="password">
          Senha
        </label>
        <input
          autoComplete="current-password"
          className="flex h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
          id="password"
          name="password"
          required
          type="password"
        />
      </div>

      {error ? (
        <p
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <button
        className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/80 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-60"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Entrando..." : "Entrar"}
      </button>

      <Link
        className="block text-center text-sm text-link underline-offset-4 hover:underline"
        href="/login/forgot-password"
      >
        Esqueci minha senha
      </Link>
    </form>
  );
}
