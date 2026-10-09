import { Download } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionHeader } from "@/components/section-header";
import { currentCompetence } from "@/modules/finance/fair-expenses/domain";

export const dynamic = "force-dynamic";

export default function ExportsPage() {
  const competence = currentCompetence();
  const types = [
    [
      "gastos",
      "Despesas financeiras",
      "Totais mensais de Farmácia, Laboratório e Feira.",
    ],
    [
      "compras",
      "Compras e fornecedores",
      "Itens e históricos de compra, além dos totais de Feira.",
    ],
    [
      "internacoes",
      "Internações agregadas",
      "Data, médico responsável e quantidade; sem pacientes.",
    ],
    ["metas", "Metas de Internações", "Metas mensais e anuais configuradas."],
    [
      "producao",
      "Produção por procedimento",
      "Competência, procedimento, unidade e origem sem somar unidades diferentes.",
    ],
    [
      "cirurgias",
      "Resumo de Pequenas Cirurgias",
      "Datas futuras, capacidade e status agregados; sem identificação de pacientes.",
    ],
  ] as const;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        eyebrow="Administração"
        title="Exportações CSV"
        description="Arquivos gerados no servidor após autorização administrativa. Período limitado a 24 meses."
      />
      <section className="rounded-xl border bg-card p-5 shadow-sm sm:p-6">
        <SectionHeader
          title="Gerar arquivo"
          description="O CSV preserva caracteres do Excel, neutraliza fórmulas e registra os critérios da extração."
        />
        <form
          action="/api/exportacoes"
          method="get"
          className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_2fr_auto] sm:items-end"
        >
          <label className="grid gap-1.5 text-sm font-medium">
            Início
            <input
              required
              type="month"
              name="inicio"
              defaultValue={competence}
              className="h-10 rounded-md border bg-background px-3 font-normal"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Fim
            <input
              required
              type="month"
              name="fim"
              defaultValue={competence}
              className="h-10 rounded-md border bg-background px-3 font-normal"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Relatório
            <select
              required
              name="tipo"
              className="h-10 rounded-md border bg-background px-3 font-normal"
            >
              {types.map(([value, title]) => (
                <option key={value} value={value}>
                  {title}
                </option>
              ))}
            </select>
          </label>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
            type="submit"
          >
            <Download aria-hidden="true" className="size-4" />
            Baixar CSV
          </button>
        </form>
      </section>
      <section className="rounded-xl border bg-card p-5 shadow-sm sm:p-6">
        <SectionHeader
          title="Conteúdo dos relatórios"
          description="Filtros e consultas usam os registros persistidos de cada módulo."
        />
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {types.map(([, title, detail]) => (
            <li key={title} className="rounded-lg border p-4">
              <p className="flex items-center gap-2 font-medium">
                <Download aria-hidden="true" className="size-4 text-primary" />
                {title}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
