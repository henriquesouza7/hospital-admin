"use client";

import { useActionState, useId, useState, useTransition } from "react";
import {
  createSurgeryAppointmentAction,
  createSurgeryDayAction,
  createSurgeryWaitlistEntryAction,
  initialMinorSurgeryActionState,
  searchSurgeryPatientsAction,
  transferSurgeryWaitlistEntryAction,
  updateSurgeryAppointmentStatusAction,
  updateSurgeryDayCapacityAction,
  updateSurgeryPatientAction,
} from "./actions";
import type { SurgeryDaySummary, SurgeryPatient } from "./domain";

const fieldClass =
  "mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";
const labelClass = "text-sm font-medium text-foreground";
const buttonClass =
  "inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-60";

function Feedback({ state }: { state: { status: string; message: string } }) {
  if (!state.message) return null;
  return (
    <p
      className={`text-sm ${state.status === "error" ? "text-destructive" : "text-emerald-700"}`}
      role={state.status === "error" ? "alert" : "status"}
    >
      {state.message}
    </p>
  );
}

function PatientSelector() {
  const id = useId();
  const [query, setQuery] = useState("");
  const [patients, setPatients] = useState<SurgeryPatient[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const normalizedQuery = query.trim();
  const queryIsTooShort =
    normalizedQuery.length > 0 && normalizedQuery.length < 3;

  function search(offset: number) {
    setError("");
    startTransition(async () => {
      const result = await searchSurgeryPatientsAction(query, offset);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setPatients((current) =>
        offset === 0 ? result.patients : [...current, ...result.patients],
      );
      setHasMore(result.hasMore);
    });
  }

  return (
    <>
      <fieldset className="space-y-2">
        <legend className={labelClass}>Pessoa já cadastrada</legend>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="sr-only" htmlFor={`${id}-search`}>
            Buscar cadastro pelo nome
          </label>
          <input
            id={`${id}-search`}
            value={query}
            maxLength={160}
            disabled={pending}
            className={fieldClass}
            placeholder="Digite um nome para buscar"
            onChange={(event) => {
              setQuery(event.target.value);
              setPatients([]);
              setSelectedId("");
              setHasMore(false);
              setError("");
            }}
          />
          <button
            type="button"
            className={`${buttonClass} shrink-0`}
            disabled={pending || queryIsTooShort}
            onClick={() => search(0)}
          >
            {pending ? "Buscando…" : "Buscar"}
          </button>
        </div>
        {patients.length > 0 ? (
          <>
            <label className="sr-only" htmlFor={`${id}-patient`}>
              Selecione um cadastro encontrado
            </label>
            <select
              id={`${id}-patient`}
              name="patient_id"
              value={selectedId}
              className={fieldClass}
              onChange={(event) => setSelectedId(event.target.value)}
            >
              <option value="">Selecionar cadastro encontrado</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.name}
                </option>
              ))}
            </select>
            {hasMore ? (
              <button
                type="button"
                className="h-9 rounded-md border px-3 text-sm font-medium hover:bg-muted disabled:opacity-60"
                disabled={pending}
                onClick={() => search(patients.length)}
              >
                {pending ? "Carregando…" : "Mais resultados"}
              </button>
            ) : null}
          </>
        ) : (
          <p className="text-xs text-muted-foreground" role="status">
            {queryIsTooShort
              ? "Digite ao menos 3 caracteres para buscar pelo nome."
              : "Digite ao menos 3 caracteres para buscar ou deixe em branco para percorrer os cadastros."}
          </p>
        )}
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </fieldset>
      <label className={labelClass}>
        Ou cadastre pelo nome
        <input
          name="patient_name"
          maxLength={160}
          className={fieldClass}
          placeholder="Nome para identificação administrativa"
        />
      </label>
    </>
  );
}

export function CreateSurgeryDayForm() {
  const [state, action, pending] = useActionState(
    createSurgeryDayAction,
    initialMinorSurgeryActionState,
  );
  return (
    <form
      action={action}
      className="grid gap-4 sm:grid-cols-[1fr_9rem_auto] sm:items-end"
    >
      <label className={labelClass}>
        Data do procedimento
        <input
          required
          type="date"
          name="procedure_date"
          className={fieldClass}
        />
      </label>
      <label className={labelClass}>
        Capacidade
        <input
          type="number"
          name="capacity"
          min="1"
          step="1"
          placeholder="10"
          className={fieldClass}
        />
      </label>
      <button className={buttonClass} disabled={pending}>
        Criar dia
      </button>
      <div className="sm:col-span-3">
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function CreateAppointmentForm({ dayId }: { dayId: string }) {
  const [state, action, pending] = useActionState(
    createSurgeryAppointmentAction,
    initialMinorSurgeryActionState,
  );
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="surgery_day_id" value={dayId} />
      <PatientSelector />
      <label className={labelClass}>
        Status inicial
        <select
          name="status"
          defaultValue="awaiting_confirmation"
          className={fieldClass}
        >
          <option value="awaiting_confirmation">Aguardando confirmação</option>
          <option value="confirmed">Confirmado</option>
        </select>
      </label>
      <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center">
        <button className={buttonClass} disabled={pending}>
          Agendar pessoa
        </button>
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function UpdateSurgeryDayCapacityForm({
  day,
}: {
  day: SurgeryDaySummary;
}) {
  const [state, action, pending] = useActionState(
    updateSurgeryDayCapacityAction,
    initialMinorSurgeryActionState,
  );
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="surgery_day_id" value={day.id} />
      <label className={labelClass}>
        Capacidade total
        <input
          required
          type="number"
          min={day.occupied}
          name="capacity"
          defaultValue={day.capacity}
          className={`${fieldClass} w-32`}
        />
      </label>
      <button className={buttonClass} disabled={pending}>
        Salvar capacidade
      </button>
      <Feedback state={state} />
    </form>
  );
}

export function UpdateAppointmentStatusForm({
  appointmentId,
  status,
}: {
  appointmentId: string;
  status: string;
}) {
  const [state, action, pending] = useActionState(
    updateSurgeryAppointmentStatusAction,
    initialMinorSurgeryActionState,
  );
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="appointment_id" value={appointmentId} />
      <label className="sr-only" htmlFor={`status-${appointmentId}`}>
        Status do agendamento
      </label>
      <select
        id={`status-${appointmentId}`}
        name="status"
        defaultValue={status}
        className={`${fieldClass} mt-0 w-52`}
      >
        <option value="awaiting_confirmation">Aguardando confirmação</option>
        <option value="confirmed">Confirmado</option>
        <option value="cancelled">Cancelado</option>
      </select>
      <button
        className="h-10 rounded-md border px-3 text-sm font-medium hover:bg-muted"
        disabled={pending}
      >
        Atualizar
      </button>
      <Feedback state={state} />
    </form>
  );
}

export function CreateWaitlistEntryForm() {
  const [state, action, pending] = useActionState(
    createSurgeryWaitlistEntryAction,
    initialMinorSurgeryActionState,
  );
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <PatientSelector />
      <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center">
        <button className={buttonClass} disabled={pending}>
          Adicionar à fila
        </button>
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function TransferWaitlistForm({
  entryId,
  days,
}: {
  entryId: string;
  days: readonly SurgeryDaySummary[];
}) {
  const [state, action, pending] = useActionState(
    transferSurgeryWaitlistEntryAction,
    initialMinorSurgeryActionState,
  );
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="waitlist_id" value={entryId} />
      <label className="sr-only" htmlFor={`day-${entryId}`}>
        Dia de cirurgia para transferência
      </label>
      <select
        id={`day-${entryId}`}
        name="surgery_day_id"
        required
        defaultValue=""
        className={`${fieldClass} mt-0 min-w-56 w-auto`}
      >
        <option value="" disabled>
          Escolher dia com vaga
        </option>
        {days.map((day) => (
          <option key={day.id} value={day.id}>
            {new Intl.DateTimeFormat("pt-BR", {
              dateStyle: "medium",
              timeZone: "UTC",
            }).format(new Date(`${day.procedure_date}T12:00:00Z`))}{" "}
            · {day.capacity - day.occupied} vaga(s)
          </option>
        ))}
      </select>
      <button
        className="h-10 rounded-md border px-3 text-sm font-medium hover:bg-muted"
        disabled={pending}
      >
        Transferir
      </button>
      <Feedback state={state} />
    </form>
  );
}

export function UpdatePatientNameForm({
  patient,
}: {
  patient: SurgeryPatient;
}) {
  const [state, action, pending] = useActionState(
    updateSurgeryPatientAction,
    initialMinorSurgeryActionState,
  );
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="patient_id" value={patient.id} />
      <label className="sr-only" htmlFor={`patient-${patient.id}`}>
        Nome administrativo
      </label>
      <input
        id={`patient-${patient.id}`}
        required
        name="name"
        maxLength={160}
        defaultValue={patient.name}
        className={`${fieldClass} mt-0 w-64`}
      />
      <button
        className="h-10 rounded-md border px-3 text-sm font-medium hover:bg-muted"
        disabled={pending}
      >
        Salvar nome
      </button>
      <Feedback state={state} />
    </form>
  );
}
