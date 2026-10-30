"use client";
import { Button } from "@/components/ui/button";

export default function PharmacyError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      role="alert"
      className="mx-auto max-w-2xl rounded-xl border border-destructive/30 bg-card p-6"
    >
      <h1 className="text-lg font-semibold">
        Não foi possível carregar os dados da Farmácia
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Verifique a conexão e tente novamente. Nenhuma alteração foi confirmada
        nesta tela.
      </p>
      <Button type="button" onClick={reset} variant="outline" className="mt-4">
        Tentar novamente
      </Button>
    </div>
  );
}
