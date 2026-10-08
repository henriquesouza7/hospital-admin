"use client";

import { BarChart3, TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard } from "@/components/chart-card";
import { EmptyState } from "@/components/empty-state";
import type {
  ProductionComparison,
  ProductionMonthlySeries,
  ProductionVolume,
} from "./domain";

const quantityFormat = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 0,
});
const chartColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function groupByUnit<T extends { countingUnit: string }>(items: readonly T[]) {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const group = groups.get(item.countingUnit) ?? [];
    group.push(item);
    groups.set(item.countingUnit, group);
  }
  return [...groups.entries()];
}

export function MonthlyEvolutionCharts({
  series,
  procedureName,
}: {
  series: readonly ProductionMonthlySeries[];
  procedureName?: string;
}) {
  if (!series.length) {
    return (
      <EmptyState
        title={
          procedureName
            ? "Sem histórico no intervalo selecionado"
            : "Selecione um procedimento"
        }
        description={
          procedureName
            ? `Não há lançamentos de ${procedureName} no intervalo visível. A ausência de registro não é preenchida como quantidade zero.`
            : "A evolução mensal é apresentada para um procedimento por vez. Assim, procedimentos diferentes nunca são somados ou comparados na mesma série."
        }
        icon={TrendingUp}
      />
    );
  }

  return (
    <div className="grid gap-4">
      {groupByUnit(series).map(([unit, unitSeries]) => {
        const points = unitSeries[0]?.points ?? [];
        const chartData = points.map((point, pointIndex) => {
          const row: Record<string, string | number | null> = {
            competence: point.label,
            period: point.competence,
          };
          unitSeries.forEach((item, seriesIndex) => {
            row[`series-${seriesIndex}`] =
              item.points[pointIndex]?.quantity ?? null;
          });
          return row;
        });
        const procedureName = unitSeries[0]?.procedureName ?? "Procedimento";
        return (
          <ChartCard
            key={unit}
            title={`${procedureName} · ${unit}`}
            description="Competências mensais do recorte. Cada ponto soma somente registros do mesmo procedimento, unidade histórica e origem. Meses sem lançamento ficam separados de registros com quantidade zero."
            badge="Por competência e origem"
          >
            <div
              className="h-72 w-full"
              role="img"
              aria-label={`Evolução mensal de ${procedureName}, unidade ${unit}, separada por origem`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="competence"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    width={64}
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value: number) =>
                      quantityFormat.format(value)
                    }
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      value === null || value === undefined
                        ? "Sem registro"
                        : quantityFormat.format(Number(value)),
                      String(name),
                    ]}
                    labelFormatter={(label, payload) => {
                      const period = payload[0]?.payload?.period;
                      return `${String(label)} · ${String(period ?? "competência")}`;
                    }}
                  />
                  <Legend />
                  {unitSeries.map((item, index) => (
                    <Line
                      key={item.key}
                      type="monotone"
                      dataKey={`series-${index}`}
                      name={item.source}
                      stroke={chartColors[index % chartColors.length]}
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                      connectNulls={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        );
      })}
    </div>
  );
}

export function ComparisonCharts({
  title,
  description,
  currentLabel,
  previousLabel,
  procedureName,
  rows,
}: {
  title: string;
  description: string;
  currentLabel: string;
  previousLabel: string;
  procedureName: string;
  rows: readonly ProductionComparison[];
}) {
  if (!rows.length) {
    return (
      <EmptyState
        title="Dados insuficientes para comparação"
        description="Selecione um procedimento com registros no período atual ou no período de comparação."
        icon={BarChart3}
      />
    );
  }

  return (
    <div className="grid gap-4">
      {groupByUnit(rows).map(([unit, unitRows]) => {
        const chartData = unitRows.map((row) => ({
          source: row.source,
          current: row.currentQuantity,
          previous: row.previousQuantity,
        }));
        return (
          <ChartCard
            key={unit}
            title={`${title} · ${procedureName} · ${unit}`}
            description={`${description} As colunas são separadas por origem; não há soma entre classificações.`}
            badge="Comparação por unidade e origem"
          >
            <div
              className="h-72 w-full"
              role="img"
              aria-label={`${title} de ${procedureName}, em ${unit}, por origem`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 8, right: 12, bottom: 8, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="source" tickLine={false} axisLine={false} />
                  <YAxis
                    width={64}
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value: number) =>
                      quantityFormat.format(value)
                    }
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      value === null || value === undefined
                        ? "Sem registro"
                        : quantityFormat.format(Number(value)),
                      String(name),
                    ]}
                    labelFormatter={(label) =>
                      `Origem: ${String(label)} · ${unit}`
                    }
                  />
                  <Legend />
                  <Bar
                    dataKey="previous"
                    name={previousLabel}
                    fill="var(--chart-2)"
                  />
                  <Bar
                    dataKey="current"
                    name={currentLabel}
                    fill="var(--chart-1)"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[560px] text-left text-sm">
                <caption className="sr-only">
                  {title}: {procedureName}, unidade {unit}, com períodos e
                  origens
                </caption>
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Origem
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      {previousLabel}
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      {currentLabel}
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Variação
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {unitRows.map((row) => {
                    const variation =
                      row.currentQuantity === null ||
                      row.previousQuantity === null
                        ? null
                        : row.currentQuantity - row.previousQuantity;
                    return (
                      <tr key={row.key} className="border-t">
                        <th scope="row" className="px-3 py-2 font-medium">
                          {row.source}
                        </th>
                        <td className="px-3 py-2">
                          {row.previousQuantity === null
                            ? "Sem histórico"
                            : quantityFormat.format(row.previousQuantity)}
                        </td>
                        <td className="px-3 py-2">
                          {row.currentQuantity === null
                            ? "Sem registro"
                            : quantityFormat.format(row.currentQuantity)}
                        </td>
                        <td className="px-3 py-2">
                          {variation === null
                            ? "Dados insuficientes"
                            : `${variation > 0 ? "+" : ""}${quantityFormat.format(variation)}`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </ChartCard>
        );
      })}
    </div>
  );
}

export function TopProcedureCharts({
  volumes,
  periodLabel,
}: {
  volumes: readonly ProductionVolume[];
  periodLabel: string;
}) {
  if (!volumes.length) {
    return (
      <EmptyState
        title="Sem produção no período"
        description="Não há lançamentos persistidos para os filtros selecionados."
        icon={BarChart3}
      />
    );
  }

  return (
    <div className="grid gap-4">
      {groupByUnit(volumes).map(([unit, unitVolumes]) => {
        const chartData = unitVolumes.slice(0, 10).map((volume) => ({
          label: `${volume.procedureName} · ${volume.source}`,
          quantity: volume.quantity,
          procedure: volume.procedureName,
          category: volume.categoryName,
          source: volume.source,
          records: volume.recordCount,
        }));
        return (
          <ChartCard
            key={unit}
            title={`Maiores volumes individuais · ${unit}`}
            description={`Período: ${periodLabel}. Ranking por procedimento, unidade histórica e origem. Procedimentos e origens não são somados entre si.`}
            badge="Até 10 combinações"
          >
            <div
              className="h-[22rem] w-full"
              role="img"
              aria-label={`Maiores volumes por procedimento e origem, unidade ${unit}`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={chartData}
                  margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value: number) =>
                      quantityFormat.format(value)
                    }
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={220}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(value) => [
                      quantityFormat.format(Number(value)),
                      `Quantidade (${unit})`,
                    ]}
                    labelFormatter={(label, payload) => {
                      const row = payload[0]?.payload;
                      return `${String(label)} · ${String(row?.category ?? "categoria")}`;
                    }}
                  />
                  <Bar
                    dataKey="quantity"
                    name={`Quantidade (${unit})`}
                    fill="var(--chart-1)"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              Agregação: soma das quantidades por procedimento, unidade de
              contagem histórica e origem, no período filtrado. O volume não
              representa qualidade clínica.
            </p>
          </ChartCard>
        );
      })}
    </div>
  );
}
