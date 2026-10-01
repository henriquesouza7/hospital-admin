"use client";

import { useActionState } from "react";
import { signInWithPassword, type LoginState } from "@/lib/auth/actions";

type LoginFormProps = Readonly<{ next?: string }>;

const initialState: LoginState = {};

export function LoginForm({ next }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState(
    signInWithPassword,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-5">
      <input name="next" type="hidden" value={next ?? ""} />

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

      {state.error ? (
        <p
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}

      <button
        className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/80 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-60"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
