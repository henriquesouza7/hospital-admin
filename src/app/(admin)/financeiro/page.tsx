import Link from "next/link";
import {
  ArrowRight,
  ChartNoAxesCombined,
  FlaskConical,
  Pill,
  ShoppingBasket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";

export default function FinancePage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow="Hospital Admin"
        title="Financeiro"
        description="Base compartilhada para compras, despesas e análises administrativas."
      />
      <section className="grid gap-4 rounded-xl border bg-card p-6 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <span className="inline-flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <Pill aria-hidden="true" className="size-5" />
          </span>
          <h2 className="mt-4 text-lg font-semibold">Farmácia</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Cadastro de fornecedores e produtos, pedidos de compra e histórico
            de preços por item.
          </p>
        </div>
        <Button
          nativeButton={false}
          render={<Link href="/financeiro/farmacia" />}
        >
          Abrir Farmácia
          <ArrowRight aria-hidden="true" />
        </Button>
      </section>
      <section className="grid gap-4 rounded-xl border bg-card p-6 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <span className="inline-flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <FlaskConical aria-hidden="true" className="size-5" />
          </span>
          <h2 className="mt-4 text-lg font-semibold">Laboratório</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Cadastro de produtos e pedidos de compra com histórico de preços por
            item.
          </p>
        </div>
        <Button
          nativeButton={false}
          render={<Link href="/financeiro/laboratorio" />}
        >
          Abrir Laboratório
          <ArrowRight aria-hidden="true" />
        </Button>
      </section>
      <section className="grid gap-4 rounded-xl border bg-card p-6 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <span className="inline-flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <ShoppingBasket aria-hidden="true" className="size-5" />
          </span>
          <h2 className="mt-4 text-lg font-semibold">Feira</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Registre o total mensal consolidado e acompanhe variações e resumo
            anual.
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/financeiro/feira" />}>
          Abrir Feira
          <ArrowRight aria-hidden="true" />
        </Button>
      </section>
      <section className="grid gap-4 rounded-xl border bg-card p-6 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <span className="inline-flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <ChartNoAxesCombined aria-hidden="true" className="size-5" />
          </span>
          <h2 className="mt-4 text-lg font-semibold">
            Indicadores e comparativos
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Consulte gastos consolidados, evolução mensal e comparações
            históricas de preços.
          </p>
        </div>
        <Button
          nativeButton={false}
          render={<Link href="/financeiro/indicadores" />}
        >
          Abrir indicadores
          <ArrowRight aria-hidden="true" />
        </Button>
      </section>
    </div>
  );
}
