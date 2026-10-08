"use client";

import { useActionState, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { ProductionProcedure } from "@/modules/production/domain";
import {
  confirmProductionSusImportAction,
  previewProductionSusCsvAction,
  reconcileProductionSusImportAction,
} from "./actions";
import { initialProductionImportActionState } from "./action-state";
import type { PendingProductionImportRow } from "./repository";

const sourceTypeLabels = {
  apresentado: "Apresentado",
  aprovado: "Aprovado",
  realizado: "Realizado",
} as const;

const fieldClassName =
  "border-input bg-background ring-offset-background focus-visible:ring-ring h-10 w-full rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none";

function ColumnSelect({
  name,
  label,
  headers,
  value,
  onChange,
  optional = false,
}: {
  name: string;
  label: string;
  headers: readonly string[];
  value: number | "";
  onChange: (value: number | "") => void;
  optional?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
        {optional ? " (opcional)" : ""}
      </label>
      <select
        id={name}
        className={fieldClassName}
        value={value}
        onChange={(event) =>
          onChange(event.target.value === "" ? "" : Number(event.target.value))
        }
      >
        <option value="">Selecione a coluna</option>
        {headers.map((header, index) => (
          <option key={`${index}-${header}`} value={index}>
            {header}
          </option>
        ))}
      </select>
    </div>
  );
}

export function ProductionSusImportForm({
  procedures,
  defaultPeriod,
}: {
  procedures: readonly ProductionProcedure[];
  defaultPeriod: string;
}) {
  const [state, action, pending] = useActionState(
    previewProductionSusCsvAction,
    initialProductionImportActionState,
  );
  const [procedureColumn, setProcedureColumn] = useState<number | "">("");
  const [quantityColumn, setQuantityColumn] = useState<number | "">("");
  const [sourceColumn, setSourceColumn] = useState<number | "">("");
  const [codeColumn, setCodeColumn] = useState<number | "">("");
  const [mappings, setMappings] = useState<{
    previewToken: string;
    values: Record<string, string>;
  }>({ previewToken: "", values: {} });
  const columns = useMemo(() => {
    if (procedureColumn === "" || quantityColumn === "" || sourceColumn === "")
      return null;
    return {
      procedure: procedureColumn,
      quantity: quantityColumn,
      sourceType: sourceColumn,
      ...(codeColumn === "" ? {} : { code: codeColumn }),
    };
  }, [procedureColumn, quantityColumn, sourceColumn, codeColumn]);
  const activeProcedures = procedures.filter((procedure) => procedure.active);
  const previewMappings =
    state.previewToken && mappings.previewToken === state.previewToken
      ? mappings.values
      : {};

  return (
    <section
      className="rounded-xl border bg-white p-5 shadow-sm sm:p-6"
      aria-labelledby="sus-import-title"
    >
      <div className="max-w-3xl">
        <h2 id="sus-import-title" className="text-xl font-semibold">
          Importar relatório SUS (CSV)
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A prévia não persiste o arquivo. Faça o vínculo manual de cada
          procedimento; não há associação automática por semelhança. Arquivos
          com identificadores de pacientes são recusados.
        </p>
      </div>

      <form action={action} className="mt-6 space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <label htmlFor="sus-csv" className="text-sm font-medium">
              Arquivo CSV
            </label>
            <input
              id="sus-csv"
              name="csv"
              type="file"
              accept=".csv,text/csv"
              required
              className={fieldClassName}
            />
            <p className="text-xs text-muted-foreground">
              UTF-8, até 2 MB, 500 linhas e 40 colunas.
            </p>
          </div>
          <div className="space-y-2">
            <label
              htmlFor="sus-reference-period"
              className="text-sm font-medium"
            >
              Competência
            </label>
            <input
              id="sus-reference-period"
              name="reference_period"
              type="month"
              defaultValue={defaultPeriod}
              required
              className={fieldClassName}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="sus-delimiter" className="text-sm font-medium">
              Separador
            </label>
            <select
              id="sus-delimiter"
              name="delimiter"
              defaultValue=";"
              className={fieldClassName}
            >
              <option value=";">Ponto e vírgula (;)</option>
              <option value=",">Vírgula (,)</option>
            </select>
          </div>
        </div>

        {state.status === "idle" && (
          <Button type="submit" disabled={pending}>
            {pending ? "Lendo cabeçalho…" : "Ler cabeçalho"}
          </Button>
        )}

        {state.status === "headers" && state.headers && (
          <div className="space-y-4 rounded-lg border border-sky-200 bg-sky-50/50 p-4">
            <div>
              <h3 className="font-medium">Mapeie as colunas do relatório</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Competência é informada acima. Código é opcional; procedimento,
                quantidade e classificação são obrigatórios.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <ColumnSelect
                name="sus-procedure-column"
                label="Nome do procedimento"
                headers={state.headers}
                value={procedureColumn}
                onChange={setProcedureColumn}
              />
              <ColumnSelect
                name="sus-quantity-column"
                label="Quantidade"
                headers={state.headers}
                value={quantityColumn}
                onChange={setQuantityColumn}
              />
              <ColumnSelect
                name="sus-source-column"
                label="Classificação da produção"
                headers={state.headers}
                value={sourceColumn}
                onChange={setSourceColumn}
              />
              <ColumnSelect
                name="sus-code-column"
                label="Código SUS"
                headers={state.headers}
                value={codeColumn}
                onChange={setCodeColumn}
                optional
              />
            </div>
            {columns && (
              <input
                type="hidden"
                name="columns"
                value={JSON.stringify(columns)}
              />
            )}
            <Button type="submit" disabled={pending || !columns}>
              {pending ? "Validando arquivo…" : "Gerar prévia validada"}
            </Button>
          </div>
        )}

        {state.status === "preview" &&
          state.groups &&
          state.previewToken &&
          columns && (
            <div className="space-y-4">
              <input
                type="hidden"
                name="columns"
                value={JSON.stringify(columns)}
              />
              <input
                type="hidden"
                name="preview_token"
                value={state.previewToken}
              />
              <p
                className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
                role="status"
              >
                {state.message} {state.rowCount} linhas válidas em{" "}
                {state.groups.length} combinações de procedimento e
                classificação.
              </p>
              {state.groups.map((group) => (
                <div
                  key={group.key}
                  className="grid gap-3 rounded-lg border p-4 md:grid-cols-[minmax(0,1fr)_minmax(15rem,0.8fr)] md:items-center"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{group.procedureName}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {group.externalCode
                        ? `Código ${group.externalCode} · `
                        : ""}
                      {sourceTypeLabels[group.sourceType]} · {group.rowCount}{" "}
                      linha(s) · total {group.quantity}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor={`mapping-${encodeURIComponent(group.key)}`}
                      className="text-sm font-medium"
                    >
                      Procedimento cadastrado
                    </label>
                    <select
                      id={`mapping-${encodeURIComponent(group.key)}`}
                      className={fieldClassName}
                      value={previewMappings[group.mappingKey] ?? ""}
                      onChange={(event) =>
                        setMappings((current) => ({
                          previewToken: state.previewToken ?? "",
                          values: {
                            ...(current.previewToken === state.previewToken
                              ? current.values
                              : {}),
                            [group.mappingKey]: event.target.value,
                          },
                        }))
                      }
                      required
                    >
                      <option value="">Selecione manualmente</option>
                      {activeProcedures.map((procedure) => (
                        <option key={procedure.id} value={procedure.id}>
                          {procedure.name} · {procedure.counting_unit} ·{" "}
                          {procedure.category_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
              {activeProcedures.length === 0 && (
                <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Não há procedimentos ativos para vincular. Cadastre ou reative
                  um procedimento antes de confirmar a importação.
                </p>
              )}
              <input
                type="hidden"
                name="mappings"
                value={JSON.stringify(previewMappings)}
              />
              <Button
                type="submit"
                formAction={confirmProductionSusImportAction}
                disabled={
                  state.groups.some(
                    (group) => !previewMappings[group.mappingKey],
                  ) || activeProcedures.length === 0
                }
              >
                Confirmar importação
              </Button>
              <Button
                type="submit"
                variant="outline"
                disabled={pending}
                className="ml-2"
              >
                {pending ? "Validando arquivo…" : "Gerar prévia novamente"}
              </Button>
            </div>
          )}

        {state.status === "error" && (
          <div className="space-y-3">
            <p
              className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive"
              role="alert"
            >
              {state.message}
            </p>
            <Button type="submit" variant="outline" disabled={pending}>
              {pending ? "Lendo cabeçalho…" : "Ler cabeçalho novamente"}
            </Button>
          </div>
        )}
      </form>
    </section>
  );
}

export function ProductionImportHistory({
  imports,
  pendingRows,
  procedures,
}: {
  imports: readonly {
    id: string;
    file_sha256: string;
    reference_period: string;
    row_count: number;
    imported_group_count: number;
    pending_group_count: number;
    status: "confirmed" | "pending_reconciliation" | "reconciled";
    created_at: string;
  }[];
  pendingRows: readonly PendingProductionImportRow[];
  procedures: readonly ProductionProcedure[];
}) {
  const groups = useMemo(() => {
    const result = new Map<string, PendingProductionImportRow[]>();
    for (const row of pendingRows) {
      const key = `${row.import_id}:${row.procedure_id}:${row.source_type}`;
      result.set(key, [...(result.get(key) ?? []), row]);
    }
    return [...result.entries()].map(([key, rows]) => ({ key, rows }));
  }, [pendingRows]);
  const procedureById = new Map(
    procedures.map((procedure) => [procedure.id, procedure]),
  );

  return (
    <section className="space-y-4" aria-labelledby="sus-import-history-title">
      <div>
        <h2 id="sus-import-history-title" className="text-xl font-semibold">
          Histórico e reconciliação
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          A quantidade apresentada pelo arquivo fica vinculada à importação e à
          decisão administrativa.
        </p>
      </div>

      {groups.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium">Conflitos que exigem decisão</h3>
          {groups.map(({ key, rows }) => {
            const first = rows[0];
            const procedure = procedureById.get(first.procedure_id);
            const importedQuantity = String(
              rows.reduce((sum, row) => sum + Number(row.quantity), 0),
            );
            return (
              <article
                key={key}
                className="rounded-lg border border-amber-300 bg-amber-50/40 p-4"
              >
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
                  <span className="font-medium">
                    {procedure?.name ?? first.procedure_name_snapshot}
                  </span>
                  <span>{sourceTypeLabels[first.source_type]}</span>
                  <span>
                    Existente na importação:{" "}
                    {first.existing_quantity_snapshot ?? "indisponível"}{" "}
                    {procedure?.counting_unit}
                  </span>
                  <span>
                    Importado: {importedQuantity} {procedure?.counting_unit}
                  </span>
                  <span>{rows.length} linha(s) de origem</span>
                </div>
                {rows.some(
                  (row) => row.import_id !== first.import_id,
                ) ? null : (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {(["keep_existing", "replace_with_import"] as const).map(
                      (resolution) => (
                        <form
                          key={resolution}
                          action={reconcileProductionSusImportAction}
                          onSubmit={(event) => {
                            if (
                              resolution === "replace_with_import" &&
                              !window.confirm(
                                "Substituir o volume registrado pelo total deste relatório SUS? A alteração será auditada.",
                              )
                            ) {
                              event.preventDefault();
                            }
                          }}
                        >
                          <input
                            type="hidden"
                            name="import_id"
                            value={first.import_id}
                          />
                          <input
                            type="hidden"
                            name="procedure_id"
                            value={first.procedure_id}
                          />
                          <input
                            type="hidden"
                            name="source_type"
                            value={first.source_type}
                          />
                          <input
                            type="hidden"
                            name="resolution"
                            value={resolution}
                          />
                          <Button
                            type="submit"
                            size="sm"
                            variant={
                              resolution === "replace_with_import"
                                ? "default"
                                : "outline"
                            }
                          >
                            {resolution === "keep_existing"
                              ? "Manter lançamento existente"
                              : "Substituir pela quantidade importada"}
                          </Button>
                        </form>
                      ),
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {imports.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          Nenhuma importação foi confirmada.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-muted/60 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Competência</th>
                <th className="px-4 py-3 font-medium">Linhas</th>
                <th className="px-4 py-3 font-medium">Grupos importados</th>
                <th className="px-4 py-3 font-medium">Pendências</th>
                <th className="px-4 py-3 font-medium">
                  Integridade do arquivo
                </th>
                <th className="px-4 py-3 font-medium">Registrada em</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {imports.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3">
                    {item.reference_period.slice(0, 7)}
                  </td>
                  <td className="px-4 py-3">{item.row_count}</td>
                  <td className="px-4 py-3">{item.imported_group_count}</td>
                  <td className="px-4 py-3">{item.pending_group_count}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {item.file_sha256.slice(0, 16)}…
                  </td>
                  <td className="px-4 py-3">
                    {new Intl.DateTimeFormat("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    }).format(new Date(item.created_at))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
