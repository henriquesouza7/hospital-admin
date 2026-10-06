"use client";

import { useActionState } from "react";
import { ShoppingBasket } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/modules/finance/pharmacy/format";
import type { FinanceActionState } from "@/modules/finance/pharmacy/action-state";
import {
  calculateMonthlyComparison,
  type FairExpense,
  formatCompetence,
  formatDifference,
  formatPercentage,
  previousCompetence,
} from "./domain";
import { createFairExpenseAction, updateFairExpenseAction } from "./actions";

const initialState: FinanceActionState = { status: "idle", message: "" };

type ExpenseFormProps = Readonly<{ state: FinanceActionState }>;

function ActionMessage({ state }: ExpenseFormProps) {
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

export function FairExpenseCreateForm({
  defaultCompetence,
}: {
  defaultCompetence: string;
}) {
  const [state, action, pending] = useActionState(
    createFairExpenseAction,
    initialState,
  );

  return (
    <form
      id="novo-registro"
      action={action}
      className="grid gap-4 rounded-xl border bg-card p-5 sm:grid-cols-3"
    >
      <div className="sm:col-span-3">
        <h2 className="font-semibold">Registrar mês</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Informe o valor mensal consolidado da Feira.
        </p>
      </div>
      <label className="grid gap-1.5 text-sm font-medium">
        Competência
        <input
          name="competence"
          type="month"
          required
          defaultValue={defaultCompetence}
          className="h-10 rounded-lg border bg-background px-3 font-normal"
        />
      </label>
      <label className="grid gap-1.5 text-sm font-medium">
        Total (R$)
        <input
          name="total_amount"
          type="number"
          min="0"
          max="9999999999.99"
          step="0.01"
          inputMode="decimal"
          required
          className="h-10 rounded-lg border bg-background px-3 font-normal"
        />
      </label>
      <label className="grid gap-1.5 text-sm font-medium sm:col-span-3">
        Observação{" "}
        <span className="font-normal text-muted-foreground">(opcional)</span>
        <textarea
          name="notes"
          maxLength={1000}
          rows={2}
          className="rounded-lg border bg-background px-3 py-2 font-normal"
        />
      </label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Salvar registro"}
        </Button>
        <ActionMessage state={state} />
      </div>
    </form>
  );
}

export function FairExpenseHistory({
  expenses,
}: {
  expenses: readonly FairExpense[];
}) {
  if (expenses.length === 0) {
    return (
      <EmptyState
        title="Nenhum mês registrado"
        description="Registre o total mensal para iniciar o histórico da Feira."
        icon={ShoppingBasket}
      />
    );
  }

  const byCompetence = new Map(
    expenses.map((expense) => [expense.competence.slice(0, 7), expense]),
  );

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-muted/70 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3">
                Competência
              </th>
              <th scope="col" className="px-4 py-3">
                Total mensal
              </th>
              <th scope="col" className="px-4 py-3">
                Variação versus mês anterior
              </th>
              <th scope="col" className="px-4 py-3">
                Observação
              </th>
              <th scope="col" className="px-4 py-3">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {expenses.map((expense) => {
              const previous = byCompetence.get(
                previousCompetence(expense.competence),
              );
              const comparison = calculateMonthlyComparison(expense, previous);
              return (
                <tr key={expense.id} className="align-top">
                  <th scope="row" className="px-4 py-4 font-medium capitalize">
                    {formatCompetence(expense.competence)}
                  </th>
                  <td className="px-4 py-4 font-medium">
                    {formatCurrency(expense.total_amount)}
                  </td>
                  <td className="px-4 py-4">
                    {comparison ? (
                      <div className="grid gap-1">
                        <span>
                          {formatDifference(comparison.differenceCents)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {comparison.percentageBasisPoints === null
                            ? "Percentual indisponível (mês anterior sem valor)"
                            : formatPercentage(
                                comparison.percentageBasisPoints,
                              )}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">
                        Sem mês anterior registrado
                      </span>
                    )}
                  </td>
                  <td className="max-w-xs px-4 py-4 text-muted-foreground">
                    {expense.notes || "—"}
                  </td>
                  <td className="px-4 py-4">
                    <FairExpenseEditor expense={expense} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FairExpenseEditor({ expense }: { expense: FairExpense }) {
  const [state, action, pending] = useActionState(
    updateFairExpenseAction,
    initialState,
  );

  return (
    <details>
      <summary className="cursor-pointer rounded-md px-2 py-1 text-sm text-link hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        Editar
      </summary>
      <form
        action={action}
        className="mt-3 grid min-w-64 gap-3 rounded-lg border bg-background p-3"
      >
        <input type="hidden" name="id" value={expense.id} />
        <p className="text-xs text-muted-foreground">
          Competência fixa: {formatCompetence(expense.competence)}
        </p>
        <label className="grid gap-1 text-xs font-medium">
          Total (R$)
          <input
            name="total_amount"
            type="number"
            min="0"
            max="9999999999.99"
            step="0.01"
            inputMode="decimal"
            required
            defaultValue={expense.total_amount}
            className="h-9 rounded-md border px-2 text-sm font-normal"
          />
        </label>
        <label className="grid gap-1 text-xs font-medium">
          Observação
          <textarea
            name="notes"
            maxLength={1000}
            rows={2}
            defaultValue={expense.notes ?? ""}
            className="rounded-md border px-2 py-1 text-sm font-normal"
          />
        </label>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Salvando…" : "Salvar alterações"}
        </Button>
        <ActionMessage state={state} />
      </form>
    </details>
  );
}
