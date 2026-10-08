export default function ProductionImportsLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-6" aria-busy="true">
      <div className="h-8 w-72 animate-pulse rounded bg-muted" />
      <div className="h-20 animate-pulse rounded-xl bg-muted" />
      <div className="h-72 animate-pulse rounded-xl bg-muted" />
      <span className="sr-only">Carregando importações de Produção…</span>
    </div>
  );
}
