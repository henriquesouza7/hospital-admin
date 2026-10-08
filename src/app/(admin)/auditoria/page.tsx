import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { SectionHeader } from "@/components/section-header";
import {
  auditModules,
  moduleForEntity,
  parseAuditDate,
  type AuditModule,
} from "@/modules/audit/domain";
import {
  listAdministrativeAudit,
  type AuditFilters,
} from "@/modules/audit/repository";

export const dynamic = "force-dynamic";

type Props = Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

function one(value: string | string[] | undefined): string | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

function localTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

export default async function AuditPage({ searchParams }: Props) {
  const search = await searchParams;
  const rawModule = one(search.module);
  const selectedModule: AuditModule =
    rawModule === "financeiro" ||
    rawModule === "internacoes" ||
    rawModule === "producao" ||
    rawModule === "pequenas-cirurgias"
      ? (rawModule as AuditModule)
      : "todos";
  const rawPage = Number(one(search.page));
  const filters: AuditFilters = {
    from: parseAuditDate(one(search.from)),
    through: parseAuditDate(one(search.through), true),
    module: selectedModule,
    entityType: one(search.entity)?.slice(0, 80) || null,
    action: one(search.action)?.slice(0, 80) || null,
    actorId: one(search.actor)?.slice(0, 160) || null,
    page: Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1,
  };
  const result = await listAdministrativeAudit(filters);
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow="Administração"
        title="Auditoria"
        description="Consulta somente leitura de alterações administrativas efetivas, com horário de Brasília e paginação determinística."
      />
      <section className="rounded-xl border bg-card p-5 shadow-sm sm:p-6">
        <SectionHeader
          title="Filtros"
          description="Os filtros são preservados ao navegar entre páginas."
        />
        <form
          method="get"
          className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6"
        >
          <label className="grid gap-1 text-sm">
            De
            <input
              className="h-10 rounded-md border bg-background px-3"
              type="date"
              name="from"
              defaultValue={one(search.from) ?? ""}
            />
          </label>
          <label className="grid gap-1 text-sm">
            Até
            <input
              className="h-10 rounded-md border bg-background px-3"
              type="date"
              name="through"
              defaultValue={one(search.through) ?? ""}
            />
          </label>
          <label className="grid gap-1 text-sm">
            Módulo
            <select
              className="h-10 rounded-md border bg-background px-3"
              name="module"
              defaultValue={selectedModule}
            >
              <option value="todos">Todos</option>
              {auditModules.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            Entidade
            <input
              className="h-10 rounded-md border bg-background px-3"
              name="entity"
              maxLength={80}
              defaultValue={one(search.entity) ?? ""}
            />
          </label>
          <label className="grid gap-1 text-sm">
            Ação
            <input
              className="h-10 rounded-md border bg-background px-3"
              name="action"
              maxLength={80}
              defaultValue={one(search.action) ?? ""}
            />
          </label>
          <label className="grid gap-1 text-sm">
            ID do responsável
            <input
              className="h-10 rounded-md border bg-background px-3"
              name="actor"
              maxLength={160}
              defaultValue={one(search.actor) ?? ""}
            />
          </label>
          <button
            className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground sm:col-span-2 xl:col-span-6"
            type="submit"
          >
            Aplicar filtros
          </button>
        </form>
      </section>
      <section className="rounded-xl border bg-card p-5 shadow-sm sm:p-6">
        <SectionHeader
          title="Eventos"
          description={`${result.events.length} eventos nesta página.`}
        />
        {result.events.length === 0 ? (
          <p className="mt-5 text-sm text-muted-foreground">
            Nenhum evento corresponde aos filtros.
          </p>
        ) : (
          <ol className="mt-4 divide-y">
            {result.events.map((event) => {
              const moduleName = moduleForEntity(event.entity_type);
              const safePayload =
                moduleName === "pequenas-cirurgias"
                  ? "Detalhes restritos nesta visão para reduzir exposição de dados pessoais."
                  : JSON.stringify(event.payload, null, 2);
              return (
                <li
                  key={event.id}
                  className="grid gap-2 py-4 md:grid-cols-[1fr_auto]"
                >
                  <div className="min-w-0">
                    <p className="font-medium">
                      {event.action.replaceAll("_", " ")} ·{" "}
                      {event.entity_type.replaceAll("_", " ")}
                    </p>
                    <p className="mt-1 break-all text-xs text-muted-foreground">
                      Registro: {event.entity_id ?? "—"} · Módulo: {moduleName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Responsável (ID): {event.actor_id ?? "Sistema"}
                    </p>
                    <details className="mt-2 text-xs">
                      <summary className="cursor-pointer text-primary">
                        Detalhes da alteração
                      </summary>
                      <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3">
                        {safePayload}
                      </pre>
                    </details>
                  </div>
                  <time
                    className="text-xs text-muted-foreground"
                    dateTime={event.created_at}
                  >
                    {localTime(event.created_at)}
                  </time>
                </li>
              );
            })}
          </ol>
        )}
        <div className="mt-4 flex items-center justify-between gap-3 border-t pt-4">
          {result.page > 1 ? (
            <Link
              className="rounded-md border px-3 py-2 text-sm"
              href={pageHref(search, result.page - 1)}
            >
              Eventos mais recentes
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-muted-foreground">
            Página {result.page}
          </span>
          {result.hasMore ? (
            <Link
              className="rounded-md border px-3 py-2 text-sm"
              href={pageHref(search, result.page + 1)}
            >
              Eventos anteriores
            </Link>
          ) : null}
        </div>
        {result.limitReached ? (
          <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
            O limite de 10.000 eventos foi atingido. Refine o período, módulo,
            ação ou ator para consultar registros mais antigos.
          </p>
        ) : null}
      </section>
    </div>
  );
}

function pageHref(
  search: Record<string, string | string[] | undefined>,
  page: number,
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    const normalized = one(value);
    if (normalized && key !== "page") params.set(key, normalized);
  }
  params.set("page", String(page));
  return `/auditoria?${params.toString()}`;
}
