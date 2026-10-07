"use client";

import { useActionState } from "react";
import {
  createSurgeryAppointmentAction,
  createSurgeryDayAction,
  createSurgeryWaitlistEntryAction,
  initialMinorSurgeryActionState,
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

function PatientSelector({
  patients,
}: {
  patients: readonly SurgeryPatient[];
}) {
  return (
    <>
      <label className={labelClass}>
        Pessoa já cadastrada
        <select name="patient_id" defaultValue="" className={fieldClass}>
          <option value="">Selecionar cadastro existente</option>
          {patients.map((patient) => (
            <option key={patient.id} value={patient.id}>
              {patient.name}
            </option>
          ))}
        </select>
      </label>
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

export function CreateAppointmentForm({
  dayId,
  patients,
}: {
  dayId: string;
  patients: readonly SurgeryPatient[];
}) {
  const [state, action, pending] = useActionState(
    createSurgeryAppointmentAction,
    initialMinorSurgeryActionState,
  );
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="surgery_day_id" value={dayId} />
      <PatientSelector patients={patients} />
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

export function CreateWaitlistEntryForm({
  patients,
}: {
  patients: readonly SurgeryPatient[];
}) {
  const [state, action, pending] = useActionState(
    createSurgeryWaitlistEntryAction,
    initialMinorSurgeryActionState,
  );
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <PatientSelector patients={patients} />
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
