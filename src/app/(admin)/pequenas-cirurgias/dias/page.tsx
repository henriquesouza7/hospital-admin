import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionHeader } from "@/components/section-header";
import { StatusBadge } from "@/components/status-badge";
import { availableCapacity } from "@/modules/minor-surgeries/domain";
import { listSurgeryDaysPage } from "@/modules/minor-surgeries/repository";

function parsePage(value: string | string[] | undefined) {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}

export default async function SurgeryDaysPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const requestedPage = parsePage((await searchParams).page);
  const { days, page, hasMore } = await listSurgeryDaysPage(requestedPage);

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
          description={`Exibindo até 50 dias por página, do mais recente para o mais antigo. Página ${page}.`}
        />
        {days.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
            {page === 1
              ? "Nenhum dia de cirurgia cadastrado."
              : "Nenhuma data encontrada nesta página."}
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
        {days.length > 0 || page > 1 ? (
          <nav
            aria-label="Paginação do histórico de datas"
            className="flex items-center justify-between gap-4"
          >
            {page > 1 ? (
              <Link
                href={`/pequenas-cirurgias/dias?page=${page - 1}`}
                rel="prev"
                className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium hover:bg-muted"
              >
                <ChevronLeft aria-hidden="true" className="size-4" />
                Datas mais recentes
              </Link>
            ) : (
              <span />
            )}
            <span className="text-sm text-muted-foreground">Página {page}</span>
            {hasMore ? (
              <Link
                href={`/pequenas-cirurgias/dias?page=${page + 1}`}
                rel="next"
                className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium hover:bg-muted"
              >
                Datas mais antigas
                <ChevronRight aria-hidden="true" className="size-4" />
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
      </section>
    </div>
  );
}
