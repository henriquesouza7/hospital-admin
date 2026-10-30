"use client";
import { Button } from "@/components/ui/button";

export default function ProductionImportsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section
      className="mx-auto max-w-3xl rounded-xl border border-destructive/30 bg-white p-6"
      role="alert"
    >
      <h1 className="text-xl font-semibold">
        Não foi possível carregar as importações
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Verifique a conexão e tente carregar a página novamente.
      </p>
      <Button type="button" onClick={() => reset()} className="mt-4">
        Tentar novamente
      </Button>
    </section>
  );
}
