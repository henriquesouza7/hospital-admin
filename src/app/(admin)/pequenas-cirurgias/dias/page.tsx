import Link from "next/link";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionHeader } from "@/components/section-header";
import { StatusBadge } from "@/components/status-badge";
import { availableCapacity } from "@/modules/minor-surgeries/domain";
import { listAllSurgeryDays } from "@/modules/minor-surgeries/repository";

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}

export default async function SurgeryDaysPage() {
  const days = await listAllSurgeryDays();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Histórico de datas"
        title="Dias de cirurgia"
        description="Consulte datas futuras e passadas, capacidade e ocupação. Agendamentos cancelados permanecem no detalhe da data."
        actions={
          <Link
            href="/pequenas-cirurgias"
            className="inline-flex h-10 items-center gap-2 rounded-md border bg-card px-4 text-sm font-medium hover:bg-muted"
          >
            <ArrowLeft aria-hidden="true" className="size-4" /> Agenda
          </Link>
        }
      />

      <section className="space-y-4">
        <SectionHeader
          title="Todas as datas"
          description={`${days.length} dia(s) cadastrado(s), do mais recente para o mais antigo.`}
        />
        {days.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
            Nenhum dia de cirurgia cadastrado.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full min-w-[42rem] text-left text-sm">
              <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Capacidade</th>
                  <th className="px-4 py-3">Ocupadas</th>
                  <th className="px-4 py-3">Livres</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">
                    <span className="sr-only">Detalhe</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {days.map((day) => (
                  <tr key={day.id}>
                    <td className="px-4 py-4 font-medium capitalize">
                      {dateLabel(day.procedure_date)}
                    </td>
                    <td className="px-4 py-4">{day.capacity}</td>
                    <td className="px-4 py-4">{day.occupied}</td>
                    <td className="px-4 py-4">{availableCapacity(day)}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge
                          label={`${day.awaitingConfirmation} aguardando`}
                          tone="warning"
                        />
                        <StatusBadge
                          label={`${day.confirmed} confirmados`}
                          tone="success"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Link
                        href={`/pequenas-cirurgias/dias/${day.id}`}
                        className="inline-flex h-9 items-center gap-2 rounded-md border px-3 font-medium hover:bg-muted"
                      >
                        <CalendarDays aria-hidden="true" className="size-4" />{" "}
                        Abrir dia
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
