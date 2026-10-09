import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  listAdmissionEntriesForExport,
  listAdmissionTargets,
} from "@/modules/admissions/repository";
import {
  listMonthlyExpenseTotals,
  loadIndicatorsSource,
} from "@/modules/finance/indicators/repository";
import { amountToCents } from "@/modules/finance/indicators/domain";
import { listProductionEntriesForExport } from "@/modules/production/repository";
import { getSurgerySummary } from "@/modules/minor-surgeries/repository";
import { buildCsv } from "@/modules/audit/domain";

const MAX_MONTHS = 24;
const MAX_ROWS = 10_000;
const exportTypes = [
  "gastos",
  "compras",
  "internacoes",
  "metas",
  "producao",
  "cirurgias",
] as const;
type ExportType = (typeof exportTypes)[number];

function isMonth(value: string | null): value is string {
  if (!value || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return false;
  const [year, month] = value.split("-").map(Number);
  return year >= 1900 && year <= 2100 && month >= 1 && month <= 12;
}

function monthCount(from: string, through: string) {
  const [startYear, startMonth] = from.split("-").map(Number);
  const [endYear, endMonth] = through.split("-").map(Number);
  return (endYear - startYear) * 12 + endMonth - startMonth + 1;
}

function nextMonthDate(value: string) {
  const [year, month] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
}

function money(cents: bigint) {
  const negative = cents < 0;
  const absolute = negative ? -cents : cents;
  const whole = new Intl.NumberFormat("pt-BR", {
    useGrouping: false,
  }).format(absolute / BigInt(100));
  const fraction = (absolute % BigInt(100)).toString().padStart(2, "0");
  return `${negative ? "-" : ""}${whole},${fraction}`;
}

function decimalForCsv(value: string | number) {
  const text = String(value);
  if (!/^-?\d+(?:\.\d+)?$/.test(text)) {
    throw new Error("Valor decimal inválido para exportação.");
  }
  return text.replace(".", ",");
}

function responseCsv(
  type: ExportType,
  from: string,
  through: string,
  rows: readonly (readonly unknown[])[],
) {
  if (rows.length - 1 > MAX_ROWS) {
    return NextResponse.json(
      {
        error: `A extração ultrapassa o limite de ${MAX_ROWS.toLocaleString("pt-BR")} linhas.`,
      },
      { status: 413 },
    );
  }
  const csv = buildCsv([
    [
      "Critério de extração",
      `${from} até ${through}`,
      "Dados administrativos agregados",
    ],
    ...rows,
  ]);
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${type}-${from}-${through}.csv"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

export async function GET(request: Request) {
  await requireAdmin();
  const params = new URL(request.url).searchParams;
  const type = params.get("tipo");
  const from = params.get("inicio");
  const through = params.get("fim");
  if (
    !exportTypes.some((item) => item === type) ||
    !isMonth(from) ||
    !isMonth(through)
  ) {
    return NextResponse.json(
      { error: "Selecione um tipo e um período mensal válido." },
      { status: 400 },
    );
  }
  if (from > through || monthCount(from, through) > MAX_MONTHS) {
    return NextResponse.json(
      {
        error: `O período deve estar em ordem e conter no máximo ${MAX_MONTHS} meses.`,
      },
      { status: 400 },
    );
  }
  const exportType = type as ExportType;
  const firstDay = `${from}-01`;
  const afterLastDay = nextMonthDate(through);
  try {
    switch (exportType) {
      case "gastos": {
        const monthly = await listMonthlyExpenseTotals(from, through);
        return responseCsv(exportType, from, through, [
          [
            "Competência",
            "Farmácia (R$)",
            "Laboratório (R$)",
            "Feira (R$)",
            "Total (R$)",
          ],
          ...monthly.map((item) => {
            const pharmacy = amountToCents(item.pharmacy_total);
            const laboratory = amountToCents(item.laboratory_total);
            const fair = amountToCents(item.fair_total);
            return [
              item.competence.slice(0, 7),
              money(pharmacy),
              money(laboratory),
              money(fair),
              money(pharmacy + laboratory + fair),
            ];
          }),
        ]);
      }
      case "compras": {
        const source = await loadIndicatorsSource(from, through, {
          maxPurchaseRows: MAX_ROWS + 1,
          includeProducts: false,
        });
        if (source.purchases.length > MAX_ROWS) {
          return NextResponse.json(
            {
              error:
                "A extração ultrapassa o limite de " +
                MAX_ROWS.toLocaleString("pt-BR") +
                " linhas.",
            },
            { status: 413 },
          );
        }
        return responseCsv(exportType, from, through, [
          [
            "Data",
            "Setor",
            "Fornecedor",
            "Produto",
            "Apresentação",
            "Quantidade",
            "Preço unitário (R$)",
            "Subtotal (R$)",
          ],
          ...source.purchases.map((item) => [
            item.orderDate,
            item.sector,
            item.supplierName,
            item.productName,
            item.presentation,
            decimalForCsv(item.quantity),
            decimalForCsv(item.unitPrice),
            decimalForCsv(item.lineTotal),
          ]),
          ...source.fairExpenses
            .filter(
              (expense) =>
                expense.competence.slice(0, 7) >= from &&
                expense.competence.slice(0, 7) <= through,
            )
            .map((expense) => [
              expense.competence,
              "feira",
              "",
              "Despesa mensal consolidada",
              "",
              "",
              "",
              decimalForCsv(expense.totalAmount),
            ]),
        ]);
      }
      case "internacoes": {
        const entries = await listAdmissionEntriesForExport(
          firstDay,
          afterLastDay,
          MAX_ROWS + 1,
        );
        if (entries.length > MAX_ROWS) {
          return NextResponse.json(
            {
              error:
                "A extração ultrapassa o limite de " +
                MAX_ROWS.toLocaleString("pt-BR") +
                " linhas.",
            },
            { status: 413 },
          );
        }
        return responseCsv(exportType, from, through, [
          ["Data", "Médico responsável", "Internações registradas"],
          ...entries
            .filter(
              (entry) =>
                entry.entry_date >= firstDay && entry.entry_date < afterLastDay,
            )
            .map((entry) => [
              entry.entry_date,
              entry.doctor_name,
              entry.quantity,
            ]),
        ]);
      }
      case "metas": {
        const firstYear = Number(from.slice(0, 4));
        const lastYear = Number(through.slice(0, 4));
        const targets = await listAdmissionTargets(
          String(firstYear) + "-01-01",
          String(lastYear + 1) + "-01-01",
        );
        return responseCsv(exportType, from, through, [
          ["Tipo de período", "Competência", "Meta de internações"],
          ...targets
            .filter((target) =>
              target.period_type === "year"
                ? target.reference_period.slice(0, 4) >= String(firstYear) &&
                  target.reference_period.slice(0, 4) <= String(lastYear)
                : target.reference_period >= firstDay &&
                  target.reference_period < afterLastDay,
            )
            .map((target) => [
              target.period_type === "month" ? "Mensal" : "Anual",
              target.reference_period,
              target.target_quantity,
            ]),
        ]);
      }
      case "producao": {
        const entries = await listProductionEntriesForExport(
          firstDay,
          afterLastDay,
          MAX_ROWS + 1,
        );
        if (entries.length > MAX_ROWS) {
          return NextResponse.json(
            {
              error: `A extração ultrapassa o limite de ${MAX_ROWS.toLocaleString("pt-BR")} linhas.`,
            },
            { status: 413 },
          );
        }
        return responseCsv(exportType, from, through, [
          [
            "Competência",
            "Categoria",
            "Procedimento",
            "Quantidade",
            "Unidade",
            "Origem",
          ],
          ...entries.map((entry) => [
            entry.reference_period,
            entry.category_name,
            entry.procedure_name,
            decimalForCsv(entry.quantity),
            entry.counting_unit,
            entry.source,
          ]),
        ]);
      }
      case "cirurgias": {
        const summary = await getSurgerySummary(
          firstDay,
          afterLastDay,
          MAX_ROWS + 1,
        );
        if (summary.has_more || summary.days.length >= MAX_ROWS) {
          return NextResponse.json(
            {
              error: `A extração ultrapassa o limite de ${MAX_ROWS.toLocaleString("pt-BR")} linhas.`,
            },
            { status: 413 },
          );
        }
        return responseCsv(exportType, from, through, [
          [
            "Data",
            "Capacidade",
            "Ocupadas",
            "Aguardando confirmação",
            "Confirmadas",
            "Pessoas na fila",
          ],
          ...summary.days.map((day) => [
            day.procedure_date,
            day.capacity,
            day.occupied,
            day.awaiting_confirmation,
            day.confirmed,
            "",
          ]),
          ["Fila atual", "", "", "", "", summary.waiting_count],
        ]);
      }
    }
  } catch {
    return NextResponse.json(
      { error: "Não foi possível gerar a exportação solicitada." },
      { status: 500 },
    );
  }
  return NextResponse.json(
    { error: "Tipo de exportação não suportado." },
    { status: 400 },
  );
}
