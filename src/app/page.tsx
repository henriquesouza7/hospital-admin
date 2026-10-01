import {
  Activity,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CircleDollarSign,
  FileChartColumn,
  TrendingUp,
} from "lucide-react";
import { ChartCard } from "@/components/chart-card";
import { KpiCard } from "@/components/kpi-card";
import { PageHeader } from "@/components/page-header";
import { SectionHeader } from "@/components/section-header";
import { StatusBadge } from "@/components/status-badge";

const monthlyBars = [
  { month: "Jan", value: "42%", amount: "42" },
  { month: "Fev", value: "58%", amount: "58" },
  { month: "Mar", value: "47%", amount: "47" },
  { month: "Abr", value: "71%", amount: "71" },
  { month: "Mai", value: "64%", amount: "64" },
  { month: "Jun", value: "82%", amount: "82" },
] as const;

export default function Home() {
  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <PageHeader
        eyebrow="Visão geral"
        title="Bom dia, equipe administrativa"
        description="Uma visão rápida do cenário operacional. Os indicadores abaixo são demonstrativos e não representam dados reais."
        actions={
          <StatusBadge icon={Activity} label="Dados fictícios" tone="info" />
        }
      />

      <section className="space-y-4">
        <SectionHeader
          title="Resumo do período"
          description="Visão demonstrativa dos principais indicadores do mês atual."
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            icon={CircleDollarSign}
            label="Despesas registradas"
            value="R$ 48,2 mil"
            detail="+8,4% em relação ao mês anterior"
          />
          <KpiCard
            icon={CalendarDays}
            label="Internações"
            value="186"
            detail="Volume demonstrativo acumulado"
          />
          <KpiCard
            icon={FileChartColumn}
            label="Produção hospitalar"
            value="1.248"
            detail="Registros fictícios no período"
          />
          <KpiCard
            icon={TrendingUp}
            label="Acompanhamento de metas"
            value="76%"
            detail="Progresso demonstrativo do mês"
          />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <ChartCard
          title="Evolução mensal"
          description="Exemplo de espaço reservado para um gráfico analítico."
        >
          <div
            aria-label="Gráfico demonstrativo de evolução mensal"
            className="flex h-56 items-end justify-between gap-3 border-b border-l border-border/80 px-2 pb-0 pt-5 sm:gap-5"
            role="img"
          >
            {monthlyBars.map((bar) => (
              <div
                key={bar.month}
                className="flex h-full flex-1 flex-col items-center justify-end gap-2"
              >
                <div className="flex h-full items-end">
                  <div
                    aria-label={`${bar.month}: ${bar.amount} unidades fictícias`}
                    className="w-7 rounded-t-md bg-primary/80 transition-colors hover:bg-primary sm:w-10"
                    style={{ height: bar.value }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">
                  {bar.month}
                </span>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard
          title="Acompanhamento"
          description="Exemplo de card para próximos indicadores."
        >
          <div className="space-y-5">
            <div className="rounded-lg bg-accent/70 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-accent-foreground">
                    Operação em destaque
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Espaço reservado para um resumo contextual do período.
                  </p>
                </div>
                <ArrowUpRight
                  aria-hidden="true"
                  className="size-4 text-accent-foreground"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg border bg-card text-primary-foreground">
                <BarChart3 aria-hidden="true" className="size-5" />
              </div>
              <div>
                <p className="text-sm font-medium">Indicadores configuráveis</p>
                <p className="text-xs text-muted-foreground">
                  Disponíveis quando os módulos forem implementados.
                </p>
              </div>
            </div>
          </div>
        </ChartCard>
      </section>
    </div>
  );
}
