"use client";

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
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Tentar novamente
      </button>
    </div>
  );
}
