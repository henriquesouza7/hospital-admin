import Link from "next/link";
import { ClipboardList, FileSpreadsheet, Scissors, Search } from "lucide-react";
import { DashboardActivityExport } from "./dashboard-activity-export";
import { DashboardQuickView } from "./dashboard-quick-view";
import { formatInteger } from "./domain";

export const DASHBOARD_ACTIVITY_PAGE_SIZE = 5;

export type DashboardActivityRow = Readonly<{
  id: string;
  category: "admissions" | "production" | "imports" | "surgeries";
  area: string;
  title: string;
  detail: string;
  previewDetail?: string;
  period: string;
  sortDate: string;
  quantity: string;
  metricLabel?: string;
  status: string;
  tone: "neutral" | "success" | "warning";
  href: string;
}>;

type DashboardRecordsAgendaProps = Readonly<{
  period: Readonly<{ year: number; month: number }>;
  periodLabel: string;
  competence: string;
  searchQuery: string;
  selectedCategory: string;
  filteredActivityRows: readonly DashboardActivityRow[];
  visibleActivityRows: readonly DashboardActivityRow[];
  activityPage: number;
  activityPageCount: number;
  surgery: Readonly<{
    awaiting_confirmation: number;
    confirmed: number;
    waiting_count: number;
    has_more: boolean;
    days: readonly Readonly<{
      procedure_date: string;
      awaiting_confirmation: number;
    }>[];
  }> | null;
  productionUnavailable: boolean;
  importsUnavailable: boolean;
  productionUnavailableMessage: string;
  importsUnavailableMessage: string;
  surgeryUnavailableMessage: string | null;
  hasImports: boolean;
}>;

export function DashboardRecordsAgenda({
  period,
  periodLabel,
  competence,
  searchQuery,
  selectedCategory,
  filteredActivityRows,
  visibleActivityRows,
  activityPage,
  activityPageCount,
  surgery,
  productionUnavailable,
  importsUnavailable,
  productionUnavailableMessage,
  importsUnavailableMessage,
  surgeryUnavailableMessage,
  hasImports,
}: DashboardRecordsAgendaProps) {
  const activityHref = (category: string, page = 1) => {
    const query = new URLSearchParams({
      year: String(period.year),
      month: String(period.month),
    });
    if (searchQuery) query.set("q", searchQuery);
    if (category !== "all") query.set("category", category);
    if (page > 1) query.set("page", String(page));
    return "/?" + query.toString();
  };
  return (
    <section
      aria-labelledby="dashboard-records-title"
      className="dashboard-surface min-w-0 p-[var(--dashboard-panel-padding-compact)] sm:p-[var(--dashboard-panel-padding)] lg:p-[var(--dashboard-panel-padding-wide)]"
    >
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2
            id="dashboard-records-title"
            className="text-lg font-semibold leading-6 tracking-tight text-foreground"
          >
            Registros e Agenda
          </h2>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            {periodLabel} · próximas datas da agenda.
          </p>
        </div>
        <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center">
          <form
            action="/"
            method="get"
            role="search"
            className="relative w-full min-w-0 sm:w-56"
          >
            <label htmlFor="dashboard-search" className="sr-only">
              Pesquisar registros e agenda
            </label>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <input
              id="dashboard-search"
              name="q"
              type="search"
              maxLength={80}
              defaultValue={searchQuery}
              placeholder="Pesquisar registros"
              className="h-11 w-full rounded-[var(--radius-control)] border border-input bg-card pl-9 pr-3 text-sm text-foreground shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
            />
            <input type="hidden" name="year" value={period.year} />
            <input type="hidden" name="month" value={period.month} />
            {selectedCategory !== "all" ? (
              <input type="hidden" name="category" value={selectedCategory} />
            ) : null}
          </form>
          <div className="self-end sm:self-auto">
            <DashboardActivityExport
              rows={filteredActivityRows}
              period={competence}
            />
          </div>
        </div>
      </header>

      <nav
        aria-label="Filtrar registros por área"
        className="admin-navigation-tabs mt-5"
      >
        {[
          { key: "all", label: "Todos" },
          { key: "production", label: "Produção" },
          { key: "admissions", label: "Internações" },
          { key: "surgeries", label: "Pequenas Cirurgias" },
          ...(hasImports ? [{ key: "imports", label: "Importações SUS" }] : []),
        ].map((filter) => (
          <Link
            key={filter.key}
            href={activityHref(filter.key)}
            aria-current={selectedCategory === filter.key ? "page" : undefined}
            className={`admin-navigation-tab ${selectedCategory === filter.key ? "admin-navigation-tab-active" : ""}`}
          >
            {filter.label}
          </Link>
        ))}
        {surgery && surgery.awaiting_confirmation > 0 ? (
          <DashboardQuickView
            trigger={
              <>
                Pendentes{" "}
                <span className="tabular-nums">
                  {formatInteger(surgery.awaiting_confirmation)}
                </span>
              </>
            }
            triggerLabel="Ver resumo das confirmações pendentes de Pequenas Cirurgias"
            triggerClassName="admin-navigation-tab admin-navigation-tab-warning min-h-10 gap-1 rounded-lg px-3 text-sm font-medium hover:bg-[var(--status-warning-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            title="Confirmações pendentes"
            period="Agenda · próximos 24 meses"
            primaryLabel="Aguardando confirmação"
            primaryValue={formatInteger(surgery.awaiting_confirmation)}
            details={[
              {
                label: "Confirmados",
                value: formatInteger(surgery.confirmed),
              },
              {
                label: "Fila de espera",
                value: formatInteger(surgery.waiting_count),
              },
            ]}
            sections={[
              {
                title: "Pendências por data",
                details: [
                  ...surgery.days
                    .filter((day) => day.awaiting_confirmation > 0)
                    .map((day) => ({
                      label: new Intl.DateTimeFormat("pt-BR", {
                        dateStyle: "medium",
                        timeZone: "UTC",
                      }).format(new Date(`${day.procedure_date}T12:00:00Z`)),
                      value: `${formatInteger(day.awaiting_confirmation)} ${day.awaiting_confirmation === 1 ? "pendente" : "pendentes"}`,
                    })),
                  ...(surgery.has_more
                    ? [
                        {
                          label: "Outras datas",
                          value: "Disponíveis na agenda completa",
                        },
                      ]
                    : []),
                ],
              },
            ]}
            presentation="drawer"
            href="/pequenas-cirurgias/dias"
            hrefLabel="Abrir agenda"
          />
        ) : null}
      </nav>

      {productionUnavailable || importsUnavailable || !surgery ? (
        <div
          role="status"
          className="mt-4 space-y-1 text-sm text-muted-foreground"
        >
          {productionUnavailable ? <p>{productionUnavailableMessage}</p> : null}
          {importsUnavailable ? <p>{importsUnavailableMessage}</p> : null}
          {!surgery ? <p>{surgeryUnavailableMessage}</p> : null}
        </div>
      ) : null}

      {visibleActivityRows.length === 0 ? (
        <p
          role="status"
          className="mt-5 rounded-xl bg-muted/50 px-4 py-6 text-sm text-muted-foreground"
        >
          {searchQuery
            ? "Nenhum registro corresponde à pesquisa nesta seleção."
            : "Nenhum registro encontrado nesta seleção."}
        </p>
      ) : (
        <>
          <div className="mt-4 hidden overflow-x-auto xl:block">
            <table className="w-full table-fixed border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border/70 text-muted-foreground">
                  <th scope="col" className="w-[18%] px-3 py-3 font-medium">
                    Área
                  </th>
                  <th scope="col" className="w-[32%] px-3 py-3 font-medium">
                    Registro
                  </th>
                  <th scope="col" className="w-[18%] px-3 py-3 font-medium">
                    Período ou data
                  </th>
                  <th scope="col" className="w-[15%] px-3 py-3 font-medium">
                    Quantidade
                  </th>
                  <th scope="col" className="w-[17%] px-3 py-3 font-medium">
                    Situação
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleActivityRows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border/60 last:border-0 hover:bg-muted/25"
                  >
                    <td className="px-3 py-4 text-muted-foreground">
                      <span className="inline-flex items-center gap-2.5">
                        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
                          {row.area === "Produção" ? (
                            <ClipboardList
                              aria-hidden="true"
                              className="size-3.5"
                            />
                          ) : row.area === "Importação SUS" ? (
                            <FileSpreadsheet
                              aria-hidden="true"
                              className="size-3.5"
                            />
                          ) : (
                            <Scissors aria-hidden="true" className="size-3.5" />
                          )}
                        </span>
                        {row.area}
                      </span>
                    </td>
                    <td className="px-3 py-4">
                      <DashboardQuickView
                        trigger={row.title}
                        triggerLabel={`Ver resumo: ${row.title}`}
                        triggerClassName="block min-h-8 max-w-full truncate rounded-md text-left font-medium text-foreground underline-offset-4 hover:text-link hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        title={row.title}
                        period={
                          row.category === "production" ? row.period : undefined
                        }
                        primaryLabel={row.metricLabel ?? "Quantidade"}
                        primaryValue={row.quantity}
                        status={{ label: row.status, tone: row.tone }}
                        presentation="drawer"
                        sections={[
                          {
                            title: "Registro",
                            details: [{ label: "Área", value: row.area }],
                          },
                          {
                            title: "Contexto operacional",
                            details: [{ label: "Resumo", value: row.detail }],
                          },
                        ]}
                        href={row.href}
                        hrefLabel="Abrir registro completo"
                      />
                      <span
                        className="mt-0.5 block truncate text-muted-foreground"
                        title={row.previewDetail ?? row.detail}
                      >
                        {row.previewDetail ?? row.detail}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-muted-foreground">
                      {row.period}
                    </td>
                    <td className="px-3 py-4 tabular-nums text-foreground">
                      {row.quantity}
                    </td>
                    <td className="px-3 py-4">
                      <span
                        className={`inline-flex max-w-full rounded-full px-2.5 py-1 text-xs font-medium ${row.tone === "warning" ? "bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]" : row.tone === "success" ? "bg-[var(--status-success-bg)] text-[var(--status-success-text)]" : "bg-muted text-muted-foreground"}`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="mt-4 divide-y divide-border/70 xl:hidden">
            {visibleActivityRows.map((row) => (
              <li key={row.id} className="min-w-0 py-4 first:pt-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">
                      {row.area} · {row.period}
                    </p>
                    <DashboardQuickView
                      trigger={row.title}
                      triggerLabel={`Ver resumo: ${row.title}`}
                      triggerClassName="mt-1 block min-h-8 max-w-full text-left text-sm font-semibold leading-5 text-foreground underline-offset-4 hover:text-link hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      title={row.title}
                      period={
                        row.category === "production" ? row.period : undefined
                      }
                      primaryLabel={row.metricLabel ?? "Quantidade"}
                      primaryValue={row.quantity}
                      status={{ label: row.status, tone: row.tone }}
                      presentation="drawer"
                      sections={[
                        {
                          title: "Registro",
                          details: [{ label: "Área", value: row.area }],
                        },
                        {
                          title: "Contexto operacional",
                          details: [{ label: "Resumo", value: row.detail }],
                        },
                      ]}
                      href={row.href}
                      hrefLabel="Abrir registro completo"
                    />
                    <p className="mt-1 text-sm leading-5 text-muted-foreground">
                      {row.previewDetail ?? row.detail}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                    {row.quantity}
                  </span>
                </div>
                <div className="mt-3 flex items-center">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${row.tone === "warning" ? "bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]" : row.tone === "success" ? "bg-[var(--status-success-bg)] text-[var(--status-success-text)]" : "bg-muted text-muted-foreground"}`}
                  >
                    {row.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
      <footer className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4 text-sm text-muted-foreground">
        <p>
          {filteredActivityRows.length === 0
            ? "Nenhum registro nesta seleção"
            : `Exibindo ${(activityPage - 1) * DASHBOARD_ACTIVITY_PAGE_SIZE + 1}–${(activityPage - 1) * DASHBOARD_ACTIVITY_PAGE_SIZE + visibleActivityRows.length} de ${filteredActivityRows.length}`}
        </p>
        {activityPageCount > 1 ? (
          <div className="flex items-center gap-2">
            {activityPage > 1 ? (
              <Link
                className="rounded-lg px-3 py-2 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                href={activityHref(selectedCategory, activityPage - 1)}
              >
                Anterior
              </Link>
            ) : null}
            <span>
              Página {activityPage} de {activityPageCount}
            </span>
            {activityPage < activityPageCount ? (
              <Link
                className="rounded-lg px-3 py-2 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                href={activityHref(selectedCategory, activityPage + 1)}
              >
                Próxima
              </Link>
            ) : null}
          </div>
        ) : null}
      </footer>
    </section>
  );
}
