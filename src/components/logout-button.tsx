"use client";

import { signOut } from "@/lib/auth/actions";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  return (
    <form action={signOut}>
      <Button
        className="logout-button h-10 w-full justify-start"
        type="submit"
        variant="ghost"
      >
        <LogOut aria-hidden="true" />
        Sair
      </Button>
    </form>
  );
}
