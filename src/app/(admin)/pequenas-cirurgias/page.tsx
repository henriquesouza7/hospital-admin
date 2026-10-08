import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  Clock3,
  Users,
} from "lucide-react";
import { KpiCard } from "@/components/kpi-card";
import { PageHeader } from "@/components/page-header";
import { SectionHeader } from "@/components/section-header";
import { StatusBadge } from "@/components/status-badge";
import { availableCapacity } from "@/modules/minor-surgeries/domain";
import { CreateSurgeryDayForm } from "@/modules/minor-surgeries/forms";
import {
  listMinorSurgeryAudit,
  listUpcomingSurgeryDays,
} from "@/modules/minor-surgeries/repository";
import { formatOperationalTimestamp } from "@/modules/minor-surgeries/date-time";

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}

function auditLabel(action: string) {
  const labels: Record<string, string> = {
    created: "Registro criado",
    capacity_changed: "Capacidade alterada",
    updated: "Cadastro administrativo atualizado",
    status_changed: "Status do agendamento alterado",
    cancelled: "Agendamento cancelado",
    transferred: "Pessoa transferida da fila",
  };
  return labels[action] ?? "Evento administrativo";
}

function auditDetail(event: {
  entity_type: string;
  action: string;
  payload: Record<string, unknown>;
}) {
  if (event.entity_type !== "surgery_patient" || event.action !== "updated")
    return null;
  const name = event.payload.name;
  if (typeof name !== "object" || name === null || Array.isArray(name))
    return null;
  if (!("old" in name) || !("new" in name)) return null;
  if (typeof name.old !== "string" || typeof name.new !== "string") return null;
  return `Nome: ${name.old} → ${name.new}`;
}

function parseAuditPage(value: string | string[] | undefined) {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

export default async function MinorSurgeriesPage({
  searchParams,
}: {
  searchParams: Promise<{ auditPage?: string | string[] }>;
}) {
  const { auditPage: rawAuditPage } = await searchParams;
  const auditPage = parseAuditPage(rawAuditPage);
  const [days, audit] = await Promise.all([
    listUpcomingSurgeryDays(),
    listMinorSurgeryAudit(auditPage),
  ]);
  const occupied = days.reduce((total, day) => total + day.occupied, 0);
  const free = days.reduce((total, day) => total + availableCapacity(day), 0);
  const awaiting = days.reduce(
    (total, day) => total + day.awaitingConfirmation,
    0,
  );
  const confirmed = days.reduce((total, day) => total + day.confirmed, 0);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Agenda administrativa"
        title="Pequenas cirurgias"
        description="Organize datas, vagas, agendamentos e fila de espera sem registrar informações clínicas."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/pequenas-cirurgias/dias"
              className="inline-flex h-10 items-center rounded-md border bg-card px-4 text-sm font-medium hover:bg-muted"
            >
              Todas as datas
            </Link>
            <Link
              href="/pequenas-cirurgias/fila"
              className="inline-flex h-10 items-center gap-2 rounded-md border bg-card px-4 text-sm font-medium hover:bg-muted"
            >
              Fila de espera{" "}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
        }
      />

      <section
        aria-label="Resumo das próximas datas"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <KpiCard
          label="Próximos dias"
          value={String(days.length)}
          detail="Datas de procedimento cadastradas"
          icon={CalendarDays}
        />
        <KpiCard
          label="Vagas ocupadas"
          value={String(occupied)}
          detail={`${confirmed} confirmados`}
          icon={Users}
        />
        <KpiCard
          label="Vagas livres"
          value={String(free)}
          detail="Nas datas futuras cadastradas"
          icon={ClipboardList}
        />
        <KpiCard
          label="Aguardando confirmação"
          value={String(awaiting)}
          detail="Já ocupam vaga"
          icon={Clock3}
        />
      </section>

      <section className="rounded-xl border bg-card p-5 shadow-sm sm:p-6">
        <SectionHeader
          title="Criar dia de cirurgia"
          description="Escolha qualquer data válida. A capacidade sugerida é 10 e pode ser ajustada por data."
        />
        <div className="mt-5">
          <CreateSurgeryDayForm />
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader
          title="Próximas datas"
          description="Aguardando confirmação e confirmados contam como vagas ocupadas."
        />
        {days.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
            Nenhum dia de cirurgia futuro cadastrado.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {days.map((day) => (
              <Link
                key={day.id}
                href={`/pequenas-cirurgias/dias/${day.id}`}
                className="group rounded-xl border bg-card p-5 shadow-sm transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold capitalize tracking-tight">
                      {dateLabel(day.procedure_date)}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {day.occupied} de {day.capacity} vagas ocupadas ·{" "}
                      {availableCapacity(day)} livres
                    </p>
                  </div>
                  <ArrowRight
                    aria-hidden="true"
                    className="size-5 text-muted-foreground transition-transform group-hover:translate-x-1"
                  />
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <StatusBadge
                    label={`${day.awaitingConfirmation} aguardando confirmação`}
                    tone="warning"
                  />
                  <StatusBadge
                    label={`${day.confirmed} confirmados`}
                    tone="success"
                  />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border bg-card p-5 shadow-sm sm:p-6">
        <SectionHeader
          title="Histórico recente"
          description="Eventos administrativos recentes, inclusive alterações de nome com registro dos valores anterior e novo. CPF, contato e dados clínicos não são armazenados neste módulo."
        />
        {audit.events.length === 0 ? (
          <p className="mt-5 text-sm text-muted-foreground">
            Nenhum evento de pequenas cirurgias registrado ainda.
          </p>
        ) : (
          <ol className="mt-5 divide-y">
            {audit.events.map((event) => (
              <li
                key={event.id}
                className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium">
                    {auditLabel(event.action)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {event.entity_type.replaceAll("_", " ")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Responsável:{" "}
                    {event.actor_name ?? event.actor_id ?? "Sistema"}
                  </p>
                  {auditDetail(event) ? (
                    <p className="text-xs text-muted-foreground">
                      {auditDetail(event)}
                    </p>
                  ) : null}
                </div>
                <time
                  className="text-xs text-muted-foreground"
                  dateTime={event.created_at}
                >
                  {formatOperationalTimestamp(event.created_at)}
                </time>
              </li>
            ))}
          </ol>
        )}
        {(audit.page > 1 || audit.hasMore) && (
          <nav
            aria-label="Paginação do histórico administrativo"
            className="flex items-center justify-between gap-3"
          >
            {audit.page > 1 ? (
              <Link
                href={`/pequenas-cirurgias?auditPage=${audit.page - 1}`}
                className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium hover:bg-muted"
              >
                Eventos mais recentes
              </Link>
            ) : (
              <span />
            )}
            <span className="text-sm text-muted-foreground">
              Página {audit.page}
            </span>
            {audit.hasMore ? (
              <Link
                href={`/pequenas-cirurgias?auditPage=${audit.page + 1}`}
                className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium hover:bg-muted"
              >
                Eventos anteriores
              </Link>
            ) : null}
          </nav>
        )}
      </section>
    </div>
  );
}
