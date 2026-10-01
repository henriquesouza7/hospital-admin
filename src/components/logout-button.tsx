"use client";

import { signOut } from "@/lib/auth/actions";

export function LogoutButton() {
  return (
    <form action={signOut}>
      <button
        className="rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        type="submit"
      >
        Sair
      </button>
    </form>
  );
}
