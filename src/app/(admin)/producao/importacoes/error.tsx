"use client";

export default function ProductionImportsError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
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
      <button
        type="button"
        onClick={() => retry()}
        className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Tentar novamente
      </button>
    </section>
  );
}
