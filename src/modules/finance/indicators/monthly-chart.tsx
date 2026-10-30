"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/modules/admin-dashboard/domain";
import { currencyChartTickCents } from "./domain";

type ChartPoint = Readonly<{
  month: string;
  label: string;
  pharmacy: number;
  pharmacyExact: string;
  laboratory: number;
  laboratoryExact: string;
  fair: number;
  fairExact: string;
  total: number;
  totalExact: string;
  hasRecords: boolean;
}>;

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function MonthlyChart({
  points,
  scale,
  highlightedMonth,
}: {
  points: readonly ChartPoint[];
  scale: string;
  highlightedMonth: string;
}) {
  return (
    <div
      className="h-64 w-full"
      role="img"
      aria-label="Gráfico de barras do total mensal de gastos. O mês final do período está destacado."
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={points}
          margin={{ top: 12, right: 8, bottom: 4, left: 4 }}
        >
          <CartesianGrid
            vertical={false}
            strokeDasharray="3 3"
            stroke="var(--border)"
          />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          />
          <YAxis
            width={76}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            tickFormatter={(value: number) =>
              formatCurrency(currencyChartTickCents(value, BigInt(scale)))
            }
          />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.45 }}
            formatter={(value, name, item) => {
              const point = item.payload as ChartPoint;
              return [
                point.totalExact ?? currency.format(Number(value)),
                name ?? "Total",
              ];
            }}
            labelFormatter={(label) =>
              `${label} · ${points.find((point) => point.label === label)?.hasRecords ? "Com registros" : "Sem registros"}`
            }
          />
          <Bar
            dataKey="total"
            name="Total"
            maxBarSize={36}
            radius={[5, 5, 1, 1]}
          >
            {points.map((point) => (
              <Cell
                key={point.month}
                fill={
                  point.month === highlightedMonth && point.hasRecords
                    ? "var(--chart-1)"
                    : "var(--border)"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
