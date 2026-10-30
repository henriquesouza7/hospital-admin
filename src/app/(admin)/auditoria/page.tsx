import { SelectField } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DatePickerField } from "@/components/ui/date-picker-field";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { SectionHeader } from "@/components/section-header";
import { ChevronDown } from "lucide-react";
import {
  auditModules,
  buildAuditPageHref,
  describeAuditEvent,
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

const moduleLabels = {
  todos: "Todos os módulos",
  financeiro: "Financeiro",
  internacoes: "Internações",
  producao: "Produção",
  "pequenas-cirurgias": "Pequenas Cirurgias",
  outros: "Outro módulo",
} as const;

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
  const requestedPage =
    Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const cursorAt = one(search.cursor_at);
  const cursorId = one(search.cursor_id);
  const cursorDirection =
    one(search.cursor_direction) === "before" ? "before" : "after";
  const filters: AuditFilters = {
    from: parseAuditDate(one(search.from)),
    through: parseAuditDate(one(search.through), true),
    module: selectedModule,
    entityType: one(search.entity)?.slice(0, 80) || null,
    action: one(search.action)?.slice(0, 80) || null,
    actorId: one(search.actor)?.slice(0, 160) || null,
    page: requestedPage,
    cursor:
      cursorAt !== null && cursorId !== null
        ? { createdAt: cursorAt, id: cursorId }
        : null,
    cursorDirection,
  };
  const result = await listAdministrativeAudit(filters);
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administração"
        title="Auditoria"
        description="Acompanhe o que mudou, a conta responsável e o horário de cada alteração administrativa."
      />
      <section className="rounded-xl border bg-card p-5 shadow-sm sm:p-6">
        <SectionHeader
          title="Filtros"
          description="Refine por período e módulo. Os filtros são preservados ao navegar entre páginas."
        />
        <form
          method="get"
          className="mt-4 grid gap-3 [&_input]:min-w-0 [&_input]:w-full"
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="grid gap-1 text-sm">
              De
              <DatePickerField
                name="from"
                defaultValue={one(search.from) ?? ""}
              />
            </label>
            <label className="grid gap-1 text-sm">
              Até
              <DatePickerField
                name="through"
                defaultValue={one(search.through) ?? ""}
              />
            </label>
            <label className="grid gap-1 text-sm">
              Módulo
              <SelectField name="module" defaultValue={selectedModule}>
                <option value="todos">Todos</option>
                {auditModules.map((item) => (
                  <option key={item} value={item}>
                    {moduleLabels[item]}
                  </option>
                ))}
              </SelectField>
            </label>
          </div>
          <details
            className="group rounded-lg border border-border/80"
            open={Boolean(
              filters.entityType || filters.action || filters.actorId,
            )}
          >
            <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between rounded-lg px-3 text-sm font-medium text-link hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
              Filtros avançados
              <ChevronDown
                aria-hidden="true"
                className="size-4 transition-transform group-open:rotate-180"
              />
            </summary>
            <div className="grid gap-3 border-t border-border/80 p-3 sm:grid-cols-3">
              <label className="grid gap-1 text-sm">
                Tipo de registro
                <input
                  className="h-10 rounded-md border bg-background px-3"
                  name="entity"
                  maxLength={80}
                  defaultValue={one(search.entity) ?? ""}
                />
              </label>
              <label className="grid gap-1 text-sm">
                Código da ação
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
            </div>
          </details>
          <div className="flex justify-end">
            <Button className="h-10 w-full px-5 sm:w-auto" type="submit">
              Aplicar filtros
            </Button>
          </div>
        </form>
      </section>
      <section className="rounded-xl border bg-card p-5 shadow-sm sm:p-6">
        <SectionHeader
          title="Histórico de alterações"
          description={`${result.events.length} registros nesta página · horários de Brasília.`}
        />
        {result.events.length === 0 ? (
          <p className="mt-5 text-sm text-muted-foreground">
            Nenhum evento corresponde aos filtros.
          </p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-xl border border-border/80">
            <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1.35fr)_minmax(10rem,0.8fr)] gap-5 bg-muted/70 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground lg:grid">
              <span>O que aconteceu</span>
              <span>Responsável</span>
              <span>Quando</span>
            </div>
            <ol className="divide-y divide-border/80">
              {result.events.map((event) => {
                const moduleName = moduleForEntity(event.entity_type);
                const description = describeAuditEvent(
                  event.entity_type,
                  event.action,
                  event.payload,
                );
                const safePayload =
                  moduleName === "pequenas-cirurgias"
                    ? "Detalhes restritos nesta visão para reduzir exposição de dados pessoais."
                    : JSON.stringify(event.payload, null, 2);
                return (
                  <li
                    key={event.id}
                    className="grid gap-4 bg-card px-4 py-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.35fr)_minmax(10rem,0.8fr)] lg:gap-5 lg:px-5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        {description.subject}
                        {description.context ? ` · ${description.context}` : ""}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span
                          className={
                            description.tone === "warning"
                              ? "rounded-full border border-destructive/25 bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive"
                              : description.tone === "positive"
                                ? "rounded-full border border-primary/50 bg-primary/20 px-2.5 py-0.5 text-xs font-medium text-link"
                                : "rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground"
                          }
                        >
                          {description.actionLabel}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {moduleLabels[moduleName]}
                        </span>
                      </div>
                      <details className="mt-3 text-xs">
                        <summary className="w-fit cursor-pointer rounded text-link underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                          Ver detalhes
                        </summary>
                        <dl className="mt-3 grid gap-2 rounded-lg bg-muted/60 p-3 text-muted-foreground">
                          <div>
                            <dt className="font-medium text-foreground">
                              ID do registro
                            </dt>
                            <dd className="break-all">
                              {event.entity_id ?? "Não informado"}
                            </dd>
                          </div>
                          <div>
                            <dt className="font-medium text-foreground">
                              ID completo do responsável
                            </dt>
                            <dd className="break-all">
                              {event.actor_id ?? "Não identificado"}
                            </dd>
                          </div>
                          <div>
                            <dt className="font-medium text-foreground">
                              Ação e tipo registrados
                            </dt>
                            <dd className="break-all">
                              {event.action} · {event.entity_type}
                            </dd>
                          </div>
                        </dl>
                        <pre
                          aria-label="Dados técnicos da alteração"
                          className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-muted p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          tabIndex={0}
                        >
                          {safePayload}
                        </pre>
                      </details>
                    </div>
                    <div className="min-w-0 text-xs">
                      <p className="font-medium text-muted-foreground lg:sr-only">
                        Responsável
                      </p>
                      <p className="mt-1 break-all font-medium text-foreground lg:mt-0">
                        {event.actor_id
                          ? `Conta (ID) · ${event.actor_id.length > 18 ? `${event.actor_id.slice(0, 8)}…${event.actor_id.slice(-4)}` : event.actor_id}`
                          : "Não identificado"}
                      </p>
                    </div>
                    <div className="text-xs">
                      <p className="font-medium text-muted-foreground lg:sr-only">
                        Quando
                      </p>
                      <time
                        className="mt-1 block font-medium tabular-nums text-foreground lg:mt-0"
                        dateTime={event.created_at}
                      >
                        {localTime(event.created_at)}
                      </time>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
        <div className="mt-4 flex items-center justify-between gap-3 border-t pt-4">
          {result.page > 1 ? (
            <Link
              className="rounded-md border px-3 py-2 text-sm"
              href={buildAuditPageHref(
                search,
                result.page - 1,
                result.previousCursor,
                "before",
              )}
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
              href={buildAuditPageHref(
                search,
                result.page + 1,
                result.nextCursor,
                "after",
              )}
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
