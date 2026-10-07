"use client";

import { useActionState, useState } from "react";
import {
  Stethoscope,
  UserRoundCheck,
  UserRoundPlus,
  UserRoundX,
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import type { Doctor } from "./domain";
import {
  createDoctorAction,
  setDoctorActiveAction,
  updateDoctorAction,
} from "./actions";
import {
  getAdmissionsNameInputValue,
  initialAdmissionsActionState,
} from "./action-state";

type DoctorsManagementProps = Readonly<{
  doctors: readonly Doctor[];
  loadError?: boolean;
}>;

function ActionMessage({
  state,
}: {
  state: typeof initialAdmissionsActionState;
}) {
  if (state.status === "idle") return null;

  return (
    <p
      className={
        state.status === "error"
          ? "text-sm text-destructive"
          : "text-sm text-muted-foreground"
      }
      role={state.status === "error" ? "alert" : "status"}
      aria-live="polite"
    >
      {state.message}
    </p>
  );
}

function CreateDoctorForm() {
  const [state, action, pending] = useActionState(
    createDoctorAction,
    initialAdmissionsActionState,
  );
  const [nameInput, setNameInput] = useState({
    value: "",
    actionState: initialAdmissionsActionState,
  });
  const nameValue = getAdmissionsNameInputValue(nameInput, state);

  return (
    <form
      action={action}
      className="grid gap-4 rounded-xl border bg-card p-5 sm:grid-cols-[1fr_auto] sm:items-end"
    >
      <div className="grid gap-3">
        <div>
          <h2 className="font-semibold">Cadastrar médico</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            O cadastro não inclui dados de pacientes nem informações clínicas.
          </p>
        </div>
        <label className="grid gap-1.5 text-sm font-medium">
          Nome
          <input
            name="name"
            required
            maxLength={160}
            autoComplete="off"
            disabled={pending}
            value={nameValue}
            onChange={(event) =>
              setNameInput({ value: event.target.value, actionState: state })
            }
            className="h-10 rounded-lg border bg-background px-3 font-normal"
          />
        </label>
        <ActionMessage state={state} />
      </div>
      <Button type="submit" disabled={pending}>
        <UserRoundPlus aria-hidden="true" />
        {pending ? "Salvando…" : "Cadastrar médico"}
      </Button>
    </form>
  );
}

function DoctorEditor({ doctor }: { doctor: Doctor }) {
  const [editState, editAction, editPending] = useActionState(
    updateDoctorAction,
    initialAdmissionsActionState,
  );
  const [statusState, statusAction, statusPending] = useActionState(
    setDoctorActiveAction,
    initialAdmissionsActionState,
  );
  const [name, setName] = useState(doctor.name);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <details className="relative">
        <summary className="cursor-pointer rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Editar nome
        </summary>
        <form
          action={editAction}
          className="absolute right-0 z-10 mt-2 grid min-w-64 gap-3 rounded-xl border bg-card p-4 shadow-lg"
        >
          <input type="hidden" name="id" value={doctor.id} />
          <label className="grid gap-1.5 text-sm font-medium">
            Nome
            <input
              name="name"
              required
              maxLength={160}
              disabled={editPending}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="h-9 rounded-md border bg-background px-3 font-normal"
            />
          </label>
          <Button type="submit" size="sm" disabled={editPending}>
            {editPending ? "Salvando…" : "Salvar nome"}
          </Button>
          <ActionMessage state={editState} />
        </form>
      </details>

      <form action={statusAction} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="id" value={doctor.id} />
        <input type="hidden" name="active" value={String(!doctor.active)} />
        <Button
          type="submit"
          size="sm"
          variant={doctor.active ? "outline" : "secondary"}
          disabled={statusPending}
        >
          {doctor.active ? (
            <UserRoundX aria-hidden="true" />
          ) : (
            <UserRoundCheck aria-hidden="true" />
          )}
          {statusPending ? "Salvando…" : doctor.active ? "Inativar" : "Ativar"}
        </Button>
        <ActionMessage state={statusState} />
      </form>
    </div>
  );
}

export function DoctorsManagement({
  doctors,
  loadError = false,
}: DoctorsManagementProps) {
  return (
    <div className="grid gap-6">
      <CreateDoctorForm />

      <section aria-labelledby="medicos-cadastrados" className="grid gap-3">
        <div>
          <h2 id="medicos-cadastrados" className="font-semibold">
            Médicos cadastrados
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A lista inclui médicos ativos e inativos, em ordem alfabética.
          </p>
        </div>

        {loadError ? null : doctors.length === 0 ? (
          <EmptyState
            title="Nenhum médico cadastrado"
            description="Cadastre o primeiro médico para iniciar a organização administrativa das internações."
            icon={Stethoscope}
          />
        ) : (
          <ul className="divide-y rounded-xl border bg-card">
            {doctors.map((doctor) => (
              <li
                key={doctor.id}
                className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
              >
                <div className="grid gap-2">
                  <p className="font-medium text-foreground">{doctor.name}</p>
                  <StatusBadge
                    label={doctor.active ? "Ativo" : "Inativo"}
                    tone={doctor.active ? "success" : "neutral"}
                  />
                </div>
                <DoctorEditor doctor={doctor} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
