import Link from "next/link";
import {
  Activity,
  ArrowRight,
  ClipboardList,
  FileUp,
  Stethoscope,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";

const sections = [
  {
    href: "/producao/procedimentos",
    title: "Procedimentos e categorias",
    description:
      "Mantenha o catálogo, as unidades de contagem e os status dos procedimentos.",
    icon: Stethoscope,
  },
  {
    href: "/producao/lancamentos",
    title: "Lançamentos mensais",
    description:
      "Registre e corrija quantidades agregadas por competência e fonte.",
    icon: ClipboardList,
  },
  {
    href: "/producao/indicadores",
    title: "Indicadores e dashboards",
    description:
      "Analise volumes por procedimento, competência, unidade histórica e origem.",
    icon: Activity,
  },
  {
    href: "/producao/importacoes",
    title: "Importação SUS e reconciliação",
    description:
      "Valide arquivos CSV, associe procedimentos manualmente e reconcilie colisões sem duplicar volumes.",
    icon: FileUp,
  },
] as const;

export default function ProductionPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow="Módulo administrativo"
        title="Produção hospitalar"
        description="Gerencie o catálogo e os volumes mensais por procedimento, sem dados individualizados de pacientes."
      />
      <section
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
        aria-label="Áreas de Produção"
      >
        {sections.map(({ href, title, description, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group flex min-h-48 flex-col justify-between rounded-xl border bg-card p-6 transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex size-11 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <Icon aria-hidden="true" className="size-5" />
            </span>
            <span className="mt-6 flex items-start justify-between gap-4">
              <span>
                <span className="block font-semibold">{title}</span>
                <span className="mt-1 block text-sm leading-6 text-muted-foreground">
                  {description}
                </span>
              </span>
              <ArrowRight
                aria-hidden="true"
                className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1"
              />
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}
