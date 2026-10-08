"use client";

import { Button } from "@/components/ui/button";

export default function ProductionIndicatorsError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <section
      role="alert"
      className="mx-auto grid min-h-64 max-w-3xl content-center justify-items-start gap-3 rounded-xl border border-destructive/30 bg-card p-6"
    >
      <h1 className="text-lg font-semibold">
        Não foi possível carregar os indicadores
      </h1>
      <p className="text-sm leading-6 text-muted-foreground">
        Os dados persistidos de Produção não foram carregados. Tente novamente;
        nenhum valor de demonstração será exibido como se fosse dado real.
      </p>
      <Button type="button" onClick={retry}>
        Tentar novamente
      </Button>
    </section>
  );
}
