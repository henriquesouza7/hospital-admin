export default function ProductionIndicatorsLoading() {
  return (
    <div
      className="mx-auto max-w-7xl space-y-6"
      aria-busy="true"
      aria-label="Carregando indicadores de produção"
    >
      <div className="space-y-2">
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="h-8 w-72 max-w-full animate-pulse rounded bg-muted" />
        <div className="h-4 max-w-xl animate-pulse rounded bg-muted" />
      </div>
      <div className="grid gap-4 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="h-10 animate-pulse rounded bg-muted" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className="h-32 animate-pulse rounded-xl border bg-card"
          />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-xl border bg-card" />
    </div>
  );
}
