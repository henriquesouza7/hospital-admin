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

export default async function MinorSurgeriesPage() {
  const [days, audit] = await Promise.all([
    listUpcomingSurgeryDays(),
    listMinorSurgeryAudit(),
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
          description="Eventos administrativos registrados para a sua sessão. Os dados de identificação não são duplicados na auditoria."
        />
        {audit.length === 0 ? (
          <p className="mt-5 text-sm text-muted-foreground">
            Nenhum evento de pequenas cirurgias registrado ainda.
          </p>
        ) : (
          <ol className="mt-5 divide-y">
            {audit.map((event) => (
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
                </div>
                <time
                  className="text-xs text-muted-foreground"
                  dateTime={event.created_at}
                >
                  {new Intl.DateTimeFormat("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(new Date(event.created_at))}
                </time>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
