import Link from "next/link";
import { ArrowLeft, ArrowRightLeft, Users } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionHeader } from "@/components/section-header";
import { StatusBadge } from "@/components/status-badge";
import {
  CreateWaitlistEntryForm,
  TransferWaitlistForm,
  UpdatePatientNameForm,
} from "@/modules/minor-surgeries/forms";
import {
  listAvailableSurgeryDays,
  listSurgeryPatients,
  listSurgeryWaitlist,
} from "@/modules/minor-surgeries/repository";
import { formatOperationalTimestamp } from "@/modules/minor-surgeries/date-time";

function parseTransferPage(value: string | string[] | undefined) {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

export default async function SurgeryWaitlistPage({
  searchParams,
}: {
  searchParams: Promise<{ transferPage?: string | string[] }>;
}) {
  const { transferPage: rawTransferPage } = await searchParams;
  const transferPage = parseTransferPage(rawTransferPage);
  const [entries, patients, days] = await Promise.all([
    listSurgeryWaitlist(transferPage),
    listSurgeryPatients(),
    listAvailableSurgeryDays(),
  ]);
  const { waiting, transferred, hasMoreTransferred } = entries;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Ordem de entrada administrativa"
        title="Fila de espera"
        description="A ordem é cronológica e administrativa; o sistema não atribui nem infere prioridade clínica. A fila não consome vagas."
        actions={
          <Link
            href="/pequenas-cirurgias"
            className="inline-flex h-10 items-center gap-2 rounded-md border bg-card px-4 text-sm font-medium hover:bg-muted"
          >
            <ArrowLeft aria-hidden="true" className="size-4" /> Agenda
          </Link>
        }
      />

      <section className="rounded-xl border bg-card p-5 shadow-sm sm:p-6">
        <SectionHeader
          title="Adicionar pessoa"
          description="Selecione um cadastro existente ou registre somente o nome administrativo."
        />
        <div className="mt-5">
          <CreateWaitlistEntryForm patients={patients} />
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader
          title="Aguardando data"
          description={`${waiting.length} pessoa(s), em ordem de entrada mais antiga primeiro.`}
        />
        {waiting.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
            A fila de espera está vazia.
          </div>
        ) : (
          <ol className="space-y-3">
            {waiting.map((entry, index) => (
              <li
                key={entry.id}
                className="rounded-xl border bg-card p-4 shadow-sm sm:p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-start gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-semibold">{entry.patient.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Entrada em{" "}
                        {formatOperationalTimestamp(entry.created_at)}
                      </p>
                      <div className="mt-3">
                        <UpdatePatientNameForm patient={entry.patient} />
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 lg:items-end">
                    <StatusBadge
                      label="Aguardando transferência"
                      tone="info"
                      icon={Users}
                    />
                    {days.length > 0 ? (
                      <TransferWaitlistForm entryId={entry.id} days={days} />
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Nenhum dia futuro com vaga disponível.
                      </p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="space-y-4">
        <SectionHeader
          title="Transferências realizadas"
          description="O histórico conserva a entrada da fila e o vínculo com o agendamento criado. Exibindo transferências mais recentes primeiro."
        />
        {transferred.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
            Nenhuma transferência realizada.
          </div>
        ) : (
          <ul className="divide-y rounded-xl border bg-card">
            {transferred.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-4"
              >
                <div>
                  <p className="font-medium">{entry.patient.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Entrada em{" "}
                    {formatOperationalTimestamp(entry.created_at, "date")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <ArrowRightLeft
                    aria-hidden="true"
                    className="size-4 text-muted-foreground"
                  />
                  <StatusBadge label="Transferida" tone="success" />
                </div>
              </li>
            ))}
          </ul>
        )}
        {(transferPage > 1 || hasMoreTransferred) && (
          <nav
            aria-label="Paginação do histórico de transferências"
            className="flex items-center justify-between gap-3"
          >
            {transferPage > 1 ? (
              <Link
                href={`/pequenas-cirurgias/fila?transferPage=${transferPage - 1}`}
                className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium hover:bg-muted"
              >
                Transferências mais recentes
              </Link>
            ) : (
              <span />
            )}
            <span className="text-sm text-muted-foreground">
              Página {transferPage}
            </span>
            {hasMoreTransferred ? (
              <Link
                href={`/pequenas-cirurgias/fila?transferPage=${transferPage + 1}`}
                className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium hover:bg-muted"
              >
                Transferências anteriores
              </Link>
            ) : null}
          </nav>
        )}
      </section>
    </div>
  );
}
