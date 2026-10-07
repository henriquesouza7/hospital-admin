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
import type { AdmissionDashboard } from "./domain";

const monthNames = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

export function AdmissionDashboardChart({
  dashboard,
}: {
  dashboard: AdmissionDashboard;
}) {
  const points = dashboard.monthlyEvolution.map((point) => ({
    ...point,
    label: monthNames[point.month - 1],
  }));
  return (
    <div className="grid gap-5">
      <div
        className="h-72 w-full"
        role="img"
        aria-label={`Evolução mensal das internações em ${dashboard.year}`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={points}
            margin={{ top: 8, right: 12, bottom: 8, left: 0 }}
          >
            <CartesianGrid
              vertical={false}
              strokeDasharray="3 3"
              stroke="var(--border)"
            />
            <XAxis dataKey="label" tickLine={false} axisLine={false} />
            <YAxis
              allowDecimals={false}
              width={40}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              formatter={(value) => [
                `${Number(value)} internações`,
                "Quantidade",
              ]}
              labelFormatter={(label) =>
                `${label} · ${points.find((point) => point.label === label)?.isClosed ? "Período encerrado" : "Período em andamento"}`
              }
            />
            <Bar dataKey="quantity" name="Internações" radius={[5, 5, 0, 0]}>
              {points.map((point) => (
                <Cell
                  key={point.month}
                  fill={
                    point.isCurrentMonth
                      ? "var(--primary)"
                      : point.isClosed
                        ? "var(--chart-2)"
                        : "var(--muted-foreground)"
                  }
                  opacity={point.isClosed ? 0.85 : 0.42}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div
        className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground"
        aria-label="Legenda do gráfico"
      >
        <span className="inline-flex items-center gap-2">
          <i className="size-2.5 rounded-sm bg-primary" />
          Mês atual
        </span>
        <span className="inline-flex items-center gap-2">
          <i className="size-2.5 rounded-sm bg-[var(--chart-2)]" />
          Mês encerrado
        </span>
        <span className="inline-flex items-center gap-2">
          <i className="size-2.5 rounded-sm bg-muted-foreground opacity-40" />
          Mês futuro
        </span>
      </div>
    </div>
  );
}
