"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ChartPoint = Readonly<{
  month: string;
  label: string;
  pharmacy: number;
  laboratory: number;
  fair: number;
  total: number;
  hasRecords: boolean;
}>;

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function MonthlyChart({ points }: { points: readonly ChartPoint[] }) {
  return (
    <div
      className="h-72 w-full"
      role="img"
      aria-label="Gráfico da evolução mensal dos gastos por setor e total consolidado"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={points}
          margin={{ top: 8, right: 12, bottom: 8, left: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} />
          <YAxis
            width={84}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value: number) => currency.format(value)}
          />
          <Tooltip
            formatter={(value) => currency.format(Number(value))}
            labelFormatter={(label) =>
              `${label} · ${points.find((point) => point.label === label)?.hasRecords ? "Com registros" : "Sem registros"}`
            }
          />
          <Line
            type="monotone"
            dataKey="pharmacy"
            name="Farmácia"
            stroke="var(--chart-1)"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="laboratory"
            name="Laboratório"
            stroke="var(--chart-2)"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="fair"
            name="Feira"
            stroke="var(--chart-3)"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="total"
            name="Total"
            stroke="var(--primary)"
            strokeWidth={3}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
