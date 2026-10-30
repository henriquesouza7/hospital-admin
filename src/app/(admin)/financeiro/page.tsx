import {
  ChartNoAxesCombined,
  FlaskConical,
  FileSpreadsheet,
  Pill,
  ShoppingBasket,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ModuleAreaCard, ModuleAreaGrid } from "@/components/module-area";

const areas = [
  {
    href: "/financeiro/farmacia",
    title: "Farmácia",
    description:
      "Cadastro de fornecedores e produtos, pedidos de compra e histórico de preços por item.",
    icon: Pill,
  },
  {
    href: "/financeiro/importacao-fiscal",
    title: "Importação fiscal",
    description:
      "Revise XMLs de NF-e e crie pedidos para Farmácia ou Laboratório com vínculo fiscal.",
    icon: FileSpreadsheet,
  },
  {
    href: "/financeiro/laboratorio",
    title: "Laboratório",
    description:
      "Cadastro de produtos e pedidos de compra com histórico de preços por item.",
    icon: FlaskConical,
  },
  {
    href: "/financeiro/feira",
    title: "Feira",
    description:
      "Registre o total mensal consolidado e acompanhe variações e resumo anual.",
    icon: ShoppingBasket,
  },
  {
    href: "/financeiro/indicadores",
    title: "Indicadores e comparativos",
    description:
      "Consulte gastos consolidados, evolução mensal e comparações históricas de preços.",
    icon: ChartNoAxesCombined,
  },
] as const;

export default function FinancePage() {
  const operations = areas.filter(
    (area) => area.href !== "/financeiro/indicadores",
  );
  const analysis = areas.filter(
    (area) => area.href === "/financeiro/indicadores",
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Hospital Admin"
        title="Financeiro"
        description="Base compartilhada para compras, despesas e análises administrativas."
      />
      <section className="space-y-3" aria-labelledby="finance-operations-title">
        <div>
          <h2 id="finance-operations-title" className="text-lg font-semibold">
            Compras e despesas
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Acesse os registros de Farmácia, Laboratório, Feira e importação
            fiscal.
          </p>
        </div>
        <ModuleAreaGrid label="Registros de compras e despesas">
          {operations.map((area) => (
            <ModuleAreaCard key={area.href} {...area} />
          ))}
        </ModuleAreaGrid>
      </section>
      <section className="space-y-3" aria-labelledby="finance-analysis-title">
        <div>
          <h2 id="finance-analysis-title" className="text-lg font-semibold">
            Análise financeira
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Compare os totais registrados e acompanhe a evolução dos gastos.
          </p>
        </div>
        <ModuleAreaGrid label="Análises financeiras">
          {analysis.map((area) => (
            <ModuleAreaCard key={area.href} {...area} />
          ))}
        </ModuleAreaGrid>
      </section>
    </div>
  );
}
