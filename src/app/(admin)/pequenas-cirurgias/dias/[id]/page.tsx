import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarCheck, Clock3, Users } from "lucide-react";
import { KpiCard } from "@/components/kpi-card";
import { PageHeader } from "@/components/page-header";
import { SectionHeader } from "@/components/section-header";
import { StatusBadge } from "@/components/status-badge";
import {
  summarizeSurgeryDay,
  statusLabel,
} from "@/modules/minor-surgeries/domain";
import { surgeryDayIdSchema } from "@/modules/minor-surgeries/validation";
import {
  CreateAppointmentForm,
  UpdateAppointmentStatusForm,
  UpdatePatientNameForm,
  UpdateSurgeryDayCapacityForm,
} from "@/modules/minor-surgeries/forms";
import {
  getSurgeryDay,
  listDayAppointments,
} from "@/modules/minor-surgeries/repository";

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}

export default async function SurgeryDayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!surgeryDayIdSchema.safeParse(id).success) notFound();

  const [day, appointments] = await Promise.all([
    getSurgeryDay(id),
    listDayAppointments(id),
  ]);
  if (!day) notFound();

  const summary = summarizeSurgeryDay(day, appointments);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Dia de cirurgia"
        title={dateLabel(day.procedure_date)}
        description="Acompanhe capacidade, vagas e status dos agendamentos."
        actions={
          <Link
            href="/pequenas-cirurgias"
            className="inline-flex h-10 items-center gap-2 rounded-md border bg-card px-4 text-sm font-medium hover:bg-muted"
          >
            <ArrowLeft aria-hidden="true" className="size-4" /> Todas as datas
          </Link>
        }
      />

      <section
        aria-label="Capacidade do dia"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <KpiCard
          label="Capacidade total"
          value={String(summary.capacity)}
          detail="Vagas configuradas para a data"
          icon={CalendarCheck}
        />
        <KpiCard
          label="Vagas ocupadas"
          value={String(summary.occupied)}
          detail="Aguardando confirmação + confirmados"
          icon={Users}
        />
        <KpiCard
          label="Vagas livres"
          value={String(Math.max(0, summary.capacity - summary.occupied))}
          detail="Disponíveis para agendamento"
          icon={Clock3}
        />
        <KpiCard
          label="Aguardando confirmação"
          value={String(summary.awaitingConfirmation)}
          detail={`${summary.confirmed} confirmados`}
          icon={Clock3}
        />
      </section>

      <section className="rounded-xl border bg-card p-5 shadow-sm sm:p-6">
        <SectionHeader
          title="Capacidade"
          description="Não é possível reduzir abaixo dos agendamentos ativos."
        />
        <div className="mt-5">
          <UpdateSurgeryDayCapacityForm day={summary} />
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5 shadow-sm sm:p-6">
        <SectionHeader
          title="Novo agendamento"
          description="Use um cadastro existente para evitar duplicar a pessoa. Apenas o nome é necessário para identificação administrativa."
        />
        <div className="mt-5">
          <CreateAppointmentForm dayId={day.id} />
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader
          title="Pessoas agendadas"
          description="Cancelamentos preservam o registro e liberam a vaga."
        />
        {appointments.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
            Ainda não há agendamentos para esta data.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full min-w-[52rem] text-left text-sm">
              <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Pessoa</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Cadastro administrativo</th>
                  <th className="px-4 py-3">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {appointments.map((appointment) => {
                  const patient = appointment.patient;
                  const tone =
                    appointment.status === "confirmed"
                      ? "success"
                      : appointment.status === "cancelled"
                        ? "neutral"
                        : "warning";
                  return (
                    <tr key={appointment.id} className="align-top">
                      <td className="px-4 py-4 font-medium">{patient.name}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <StatusBadge
                            label={statusLabel(appointment.status)}
                            tone={tone}
                          />
                          {appointment.source_waitlist_id ? (
                            <StatusBadge
                              label="Veio da fila de espera"
                              tone="info"
                            />
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <UpdatePatientNameForm patient={patient} />
                      </td>
                      <td className="px-4 py-4">
                        <UpdateAppointmentStatusForm
                          appointmentId={appointment.id}
                          status={appointment.status}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
