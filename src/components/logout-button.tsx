"use client";

import { signOut } from "@/lib/auth/actions";

export function LogoutButton() {
  return (
    <form action={signOut}>
      <button
        className="h-9 rounded-lg border bg-card px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        type="submit"
      >
        Sair
      </button>
    </form>
  );
}
