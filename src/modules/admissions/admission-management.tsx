"use client";

import { useActionState, useState } from "react";
import { FileSpreadsheet, UserRoundPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AdmissionEntry, AdmissionTarget, Doctor } from "./domain";
import { initialAdmissionsActionState } from "./action-state";
import {
  createAdmissionEntryAction,
  createAdmissionTargetAction,
  updateAdmissionEntryAction,
  updateAdmissionTargetAction,
} from "./actions";
import {
  confirmAdmissionCsvAction,
  previewAdmissionCsvAction,
  type AdmissionImportState,
} from "./import-actions";

function ActionMessage({
  state,
}: {
  state: typeof initialAdmissionsActionState;
}) {
  if (state.status === "idle") return null;
  return (
    <p
      role={state.status === "error" ? "alert" : "status"}
      className={
        state.status === "error"
          ? "text-sm text-destructive"
          : "text-sm text-muted-foreground"
      }
    >
      {state.message}
    </p>
  );
}

export function AdmissionEntryCreateForm({
  doctors,
  defaultDate,
}: {
  doctors: readonly Doctor[];
  defaultDate: string;
}) {
  const [state, action, pending] = useActionState(
    createAdmissionEntryAction,
    initialAdmissionsActionState,
  );
  const activeDoctors = doctors.filter((doctor) => doctor.active);
  return (
    <form
      action={action}
      className="grid gap-4 rounded-xl border bg-card p-5 sm:grid-cols-3 sm:items-end"
    >
      <div className="sm:col-span-3">
        <h2 className="font-semibold">Novo lançamento diário</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Registre a quantidade agregada por data e médico responsável.
        </p>
      </div>
      <label className="grid gap-1.5 text-sm font-medium">
        Data
        <input
          name="entry_date"
          type="date"
          required
          defaultValue={defaultDate}
          className="h-10 rounded-lg border bg-background px-3 font-normal"
        />
      </label>
      <label className="grid gap-1.5 text-sm font-medium">
        Médico
        <select
          name="doctor_id"
          required
          defaultValue=""
          className="h-10 rounded-lg border bg-background px-3 font-normal"
        >
          <option value="" disabled>
            Selecione
          </option>
          {activeDoctors.map((doctor) => (
            <option key={doctor.id} value={doctor.id}>
              {doctor.name}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1.5 text-sm font-medium">
        Quantidade
        <input
          name="quantity"
          type="number"
          min="0"
          max="2147483647"
          step="1"
          required
          className="h-10 rounded-lg border bg-background px-3 font-normal"
        />
      </label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-3">
        <Button type="submit" disabled={pending || activeDoctors.length === 0}>
          <UserRoundPlus aria-hidden="true" />
          {pending ? "Salvando…" : "Registrar lançamento"}
        </Button>
        {activeDoctors.length === 0 ? (
          <span className="text-sm text-muted-foreground">
            Cadastre ou ative um médico antes de lançar.
          </span>
        ) : null}
        <ActionMessage state={state} />
      </div>
    </form>
  );
}

function AdmissionEntryEditor({ entry }: { entry: AdmissionEntry }) {
  const [state, action, pending] = useActionState(
    updateAdmissionEntryAction,
    initialAdmissionsActionState,
  );
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={entry.id} />
      <label className="sr-only" htmlFor={`quantity-${entry.id}`}>
        Quantidade de {entry.doctor_name} em {entry.entry_date}
      </label>
      <input
        id={`quantity-${entry.id}`}
        name="quantity"
        type="number"
        min="0"
        max="2147483647"
        step="1"
        required
        defaultValue={entry.quantity}
        className="h-9 w-24 rounded-md border bg-background px-2 text-sm"
      />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "Salvando…" : "Salvar"}
      </Button>
      <ActionMessage state={state} />
    </form>
  );
}

export function AdmissionEntriesTable({
  entries,
}: {
  entries: readonly AdmissionEntry[];
}) {
  if (entries.length === 0)
    return (
      <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        Nenhum lançamento encontrado para este período.
      </p>
    );
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-muted/70 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3">
                Data
              </th>
              <th scope="col" className="px-4 py-3">
                Médico
              </th>
              <th scope="col" className="px-4 py-3">
                Situação
              </th>
              <th scope="col" className="px-4 py-3">
                Quantidade
              </th>
              <th scope="col" className="px-4 py-3">
                Ação
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {entries.map((entry) => (
              <tr key={entry.id} className="align-middle">
                <th
                  scope="row"
                  className="whitespace-nowrap px-4 py-4 font-medium"
                >
                  {new Intl.DateTimeFormat("pt-BR", {
                    dateStyle: "short",
                    timeZone: "UTC",
                  }).format(new Date(`${entry.entry_date}T00:00:00Z`))}
                </th>
                <td className="px-4 py-4">{entry.doctor_name}</td>
                <td className="px-4 py-4">
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                    {entry.doctor_active ? "Ativo" : "Inativo · histórico"}
                  </span>
                </td>
                <td className="px-4 py-4">{entry.quantity}</td>
                <td className="px-4 py-3">
                  <AdmissionEntryEditor entry={entry} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const initialImportState: AdmissionImportState = {
  status: "idle",
  message: "",
};

export function AdmissionCsvImportForm() {
  const [preview, previewAction, previewPending] = useActionState(
    previewAdmissionCsvAction,
    initialImportState,
  );
  const [confirmation, confirmAction, confirmPending] = useActionState(
    confirmAdmissionCsvAction,
    initialImportState,
  );
  return (
    <section className="grid gap-4 rounded-xl border bg-card p-5">
      <div>
        <h2 className="font-semibold">Importar histórico CSV</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Arquivo UTF-8 com as colunas <code>data,medico,quantidade</code>. O
          nome do médico precisa corresponder exatamente a um cadastro ativo.
          Limite: 1 MB e 1.000 linhas.
        </p>
      </div>
      <form
        action={previewAction}
        className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"
      >
        <label className="grid gap-1.5 text-sm font-medium">
          Arquivo CSV
          <input
            type="file"
            name="csv"
            accept=".csv,text/csv"
            required
            disabled={previewPending}
            className="h-10 rounded-lg border bg-background px-3 py-1.5 font-normal file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-2 file:py-1"
          />
        </label>
        <Button type="submit" variant="outline" disabled={previewPending}>
          <FileSpreadsheet aria-hidden="true" />
          {previewPending ? "Validando…" : "Gerar prévia"}
        </Button>
      </form>
      {preview.status === "error" ? (
        <p role="alert" className="text-sm text-destructive">
          {preview.message}
        </p>
      ) : null}
      {preview.status === "success" ? (
        <div className="grid gap-3">
          <p role="status" className="text-sm text-muted-foreground">
            {preview.message}
          </p>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="bg-muted/70 text-xs uppercase text-muted-foreground">
                <tr>
                  <th scope="col" className="px-3 py-2">
                    Linha
                  </th>
                  <th scope="col" className="px-3 py-2">
                    Data
                  </th>
                  <th scope="col" className="px-3 py-2">
                    Médico informado
                  </th>
                  <th scope="col" className="px-3 py-2">
                    Quantidade
                  </th>
                  <th scope="col" className="px-3 py-2">
                    Validação
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {preview.rows.map((row) => (
                  <tr key={row.line}>
                    <th scope="row" className="px-3 py-2">
                      {row.line}
                    </th>
                    <td className="px-3 py-2">{row.entry_date}</td>
                    <td className="px-3 py-2">{row.doctor_name || "—"}</td>
                    <td className="px-3 py-2">{row.quantity}</td>
                    <td
                      className={`px-3 py-2 ${row.error ? "text-destructive" : "text-muted-foreground"}`}
                    >
                      {row.error ?? "Válida"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.rows.every((row) => !row.error) ? (
            <form
              action={confirmAction}
              className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"
            >
              <input type="hidden" name="preview_token" value={preview.token} />
              <label className="grid gap-1.5 text-sm font-medium">
                Selecione novamente o mesmo arquivo para confirmar
                <input
                  type="file"
                  name="csv"
                  accept=".csv,text/csv"
                  required
                  className="h-10 rounded-lg border bg-background px-3 py-1.5 font-normal file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-2 file:py-1"
                />
              </label>
              <Button type="submit" disabled={confirmPending}>
                {confirmPending ? "Importando…" : "Confirmar importação"}
              </Button>
            </form>
          ) : null}
          <ActionMessage state={confirmation} />
        </div>
      ) : null}
    </section>
  );
}

function AdmissionTargetEditor({ target }: { target: AdmissionTarget }) {
  const [state, action, pending] = useActionState(
    updateAdmissionTargetAction,
    initialAdmissionsActionState,
  );
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={target.id} />
      <label className="sr-only" htmlFor={`target-${target.id}`}>
        Meta de {target.reference_period}
      </label>
      <input
        id={`target-${target.id}`}
        name="target_quantity"
        type="number"
        min="0"
        max="2147483647"
        step="1"
        required
        defaultValue={target.target_quantity}
        className="h-9 w-28 rounded-md border bg-background px-2 text-sm"
      />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "Salvando…" : "Salvar"}
      </Button>
      <ActionMessage state={state} />
    </form>
  );
}

export function AdmissionTargetsTable({
  targets,
}: {
  targets: readonly AdmissionTarget[];
}) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[580px] text-left text-sm">
          <thead className="bg-muted/70 text-xs uppercase text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3">
                Granularidade
              </th>
              <th scope="col" className="px-4 py-3">
                Período
              </th>
              <th scope="col" className="px-4 py-3">
                Meta de internações
              </th>
              <th scope="col" className="px-4 py-3">
                Ação
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {targets.map((target) => (
              <tr key={target.id}>
                <th scope="row" className="px-4 py-4 font-medium">
                  {target.period_type === "month"
                    ? "Mensal · hospital"
                    : "Anual · hospital"}
                </th>
                <td className="px-4 py-4">
                  {target.period_type === "month"
                    ? new Intl.DateTimeFormat("pt-BR", {
                        month: "long",
                        year: "numeric",
                        timeZone: "UTC",
                      }).format(
                        new Date(`${target.reference_period}T00:00:00Z`),
                      )
                    : target.reference_period.slice(0, 4)}
                </td>
                <td className="px-4 py-4">{target.target_quantity}</td>
                <td className="px-4 py-3">
                  <AdmissionTargetEditor target={target} />
                </td>
              </tr>
            ))}
            {targets.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  Nenhuma meta configurada.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdmissionTargetCreateForm({
  defaultYear,
  defaultMonth,
}: {
  defaultYear: number;
  defaultMonth: string;
}) {
  const [state, action, pending] = useActionState(
    createAdmissionTargetAction,
    initialAdmissionsActionState,
  );
  const [periodType, setPeriodType] = useState<"month" | "year">("month");
  const [period, setPeriod] = useState(defaultMonth);
  return (
    <form
      action={action}
      className="grid gap-4 rounded-xl border bg-card p-5 sm:grid-cols-3 sm:items-end"
    >
      <div className="sm:col-span-3">
        <h2 className="font-semibold">Configurar meta hospitalar</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          As metas mensais e anuais são agregadas para o hospital. O histórico
          de lançamentos permanece separado.
        </p>
      </div>
      <label className="grid gap-1.5 text-sm font-medium">
        Granularidade
        <select
          name="period_type"
          value={periodType}
          onChange={(event) => {
            const nextType = event.target.value === "year" ? "year" : "month";
            setPeriodType(nextType);
            setPeriod(nextType === "year" ? String(defaultYear) : defaultMonth);
          }}
          className="h-10 rounded-lg border bg-background px-3 font-normal"
        >
          <option value="month">Mensal</option>
          <option value="year">Anual</option>
        </select>
      </label>
      <label className="grid gap-1.5 text-sm font-medium">
        Período
        <input
          name="period"
          type={periodType === "month" ? "month" : "number"}
          min={periodType === "year" ? 1900 : undefined}
          max={periodType === "year" ? 2100 : undefined}
          step={periodType === "year" ? 1 : undefined}
          required
          value={period}
          onChange={(event) => setPeriod(event.target.value)}
          className="h-10 rounded-lg border bg-background px-3 font-normal"
        />
      </label>
      <label className="grid gap-1.5 text-sm font-medium">
        Quantidade alvo
        <input
          name="target_quantity"
          type="number"
          min="0"
          max="2147483647"
          step="1"
          required
          className="h-10 rounded-lg border bg-background px-3 font-normal"
        />
      </label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Cadastrar meta"}
        </Button>
        <ActionMessage state={state} />
      </div>
    </form>
  );
}
